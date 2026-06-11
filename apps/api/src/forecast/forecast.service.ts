import { Inject, Injectable } from '@nestjs/common';
import type {
  ForecastSpec,
  ForecastResult,
  ForecastGroupRecommendation,
  Filters,
  OrderRecord,
  ResultRow,
} from '@logi/shared';
import { ORDER_REPOSITORY, type OrderRepository } from '../domain/ports';
import { applyFilters, timeBucket } from '../analytics/query-engine';
import { ForecastStrategyFactory } from './forecast-strategy.factory';

const SAFETY_STOCK_RATIO = 0.2;

function addMonths(period: string, n: number): string {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function scopeLabel(filters?: Filters): string {
  return (
    filters?.sku?.join(', ') ?? filters?.product_category?.join(', ') ?? 'All products'
  );
}

/**
 * Predictive analytics. Aggregates the chosen metric into a monthly history and
 * delegates extrapolation to a {@link ForecastStrategy}. When `groupBy` is set it
 * produces one aligned forecast line per group value (e.g. one per product
 * category), each with its own inventory recommendation. Implementation behind
 * the `forecast_demand` AI tool.
 */
@Injectable()
export class ForecastService {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    private readonly strategies: ForecastStrategyFactory,
  ) {}

  forecast(spec: ForecastSpec): ForecastResult {
    // Default to moving average: the data is noisy with an early-month spike, so a
    // least-squares trend line gets dragged down and forecasts below recent actuals.
    // A trailing moving average tracks the recent level and stays continuous.
    const method = spec.method ?? 'moving_average';
    const strategy = this.strategies.create(method);
    const filtered = applyFilters(this.orders.findAll(), spec.filters);

    // Shared month axis so every series lines up on the same timeline.
    const historyMonths = [...new Set(filtered.map((r) => timeBucket(r.order_date, 'month')))].sort();
    const lastMonth = historyMonths[historyMonths.length - 1] ?? '2025-12';
    const forecastMonths = Array.from({ length: spec.horizonMonths }, (_, i) =>
      addMonths(lastMonth, i + 1),
    );
    const allMonths = [...historyMonths, ...forecastMonths];

    // Build the groups: one per distinct dimension value, or a single 'all'.
    const groupRows: { key: string; label: string; rows: OrderRecord[] }[] = spec.groupBy
      ? [...new Set(filtered.map((r) => String(r[spec.groupBy!])))]
          .sort()
          .map((v) => ({ key: v, label: v, rows: filtered.filter((r) => String(r[spec.groupBy!]) === v) }))
      : [{ key: 'all', label: scopeLabel(spec.filters), rows: filtered }];

    const groups: ForecastGroupRecommendation[] = [];
    const valuesByLabel: Record<string, Record<string, number>> = {};

    for (const g of groupRows) {
      const byMonth = new Map<string, number>();
      for (const r of g.rows) {
        const m = timeBucket(r.order_date, 'month');
        byMonth.set(m, (byMonth.get(m) ?? 0) + (spec.metric === 'total_quantity' ? r.quantity : 1));
      }
      const historyAligned = historyMonths.map((m) => byMonth.get(m) ?? 0);
      const fc = strategy.forecast(historyAligned, spec.horizonMonths);

      const seriesValues: Record<string, number> = {};
      historyMonths.forEach((m, i) => (seriesValues[m] = historyAligned[i]));
      forecastMonths.forEach((m, i) => (seriesValues[m] = fc[i]));
      valuesByLabel[g.label] = seriesValues;

      const projectedDemand = fc.reduce((a, b) => a + b, 0);
      const safetyStock = Math.round(projectedDemand * SAFETY_STOCK_RATIO);
      groups.push({
        key: g.key,
        label: g.label,
        recommendation: {
          horizonMonths: spec.horizonMonths,
          projectedDemand,
          safetyStock,
          recommendedUnits: projectedDemand + safetyStock,
          rationale: `${g.label}: plan ${projectedDemand + safetyStock} units over ${spec.horizonMonths} month(s) — ${projectedDemand} projected + ${safetyStock} (20% safety stock).`,
        },
      });
    }

    const seriesKeys = groups.map((g) => g.label);
    const rows: ResultRow[] = allMonths.map((m) => {
      const row: ResultRow = { period: m };
      for (const k of seriesKeys) row[k] = valuesByLabel[k]?.[m] ?? 0;
      return row;
    });

    return {
      method,
      groupBy: spec.groupBy,
      rows,
      seriesKeys,
      forecastStartPeriod: forecastMonths[0] ?? null,
      groups,
      explanation: `Aggregated ${spec.metric} by month${
        spec.groupBy ? ` per ${spec.groupBy}` : ''
      } (${historyMonths.length} historical months), then applied ${method.replace(
        '_',
        ' ',
      )} per series to project ${spec.horizonMonths} month(s). Forecasts are floored at 0 and rounded to whole units.`,
    };
  }
}

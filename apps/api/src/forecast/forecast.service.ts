import { Inject, Injectable } from '@nestjs/common';
import type { ForecastSpec, ForecastResult, ForecastPoint } from '@logi/shared';
import { ORDER_REPOSITORY, type OrderRepository } from '../domain/ports';
import { applyFilters, timeBucket } from '../analytics/query-engine';
import { ForecastStrategyFactory } from './forecast-strategy.factory';

const SAFETY_STOCK_RATIO = 0.2;

function addMonths(period: string, n: number): string {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Predictive analytics: aggregates the chosen metric into a monthly history,
 * delegates extrapolation to a {@link ForecastStrategy} (chosen by the factory),
 * and derives an inventory recommendation. Implementation behind the
 * `forecast_demand` AI tool.
 */
@Injectable()
export class ForecastService {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    private readonly strategies: ForecastStrategyFactory,
  ) {}

  forecast(spec: ForecastSpec): ForecastResult {
    const strategy = this.strategies.create(spec.method ?? 'linear_regression');
    const rows = applyFilters(this.orders.findAll(), spec.filters);

    const byMonth = new Map<string, number>();
    for (const r of rows) {
      const period = timeBucket(r.order_date, 'month');
      const v = spec.metric === 'total_quantity' ? r.quantity : 1;
      byMonth.set(period, (byMonth.get(period) ?? 0) + v);
    }
    const periods = [...byMonth.keys()].sort();
    const historyValues = periods.map((p) => byMonth.get(p)!);

    const fcValues = strategy.forecast(historyValues, spec.horizonMonths);

    const series: ForecastPoint[] = periods.map((p, i) => ({
      period: p,
      value: historyValues[i],
      kind: 'history',
    }));
    const lastPeriod = periods[periods.length - 1] ?? '2025-12';
    fcValues.forEach((value, i) =>
      series.push({ period: addMonths(lastPeriod, i + 1), value, kind: 'forecast' }),
    );

    const projectedDemand = fcValues.reduce((a, b) => a + b, 0);
    const safetyStock = Math.round(projectedDemand * SAFETY_STOCK_RATIO);
    const recommendedUnits = projectedDemand + safetyStock;
    const scope =
      spec.filters?.sku?.join(', ') ??
      spec.filters?.product_category?.join(', ') ??
      'all products';

    return {
      method: strategy.method,
      series,
      inventoryRecommendation: {
        horizonMonths: spec.horizonMonths,
        projectedDemand,
        safetyStock,
        recommendedUnits,
        rationale: `Plan ${recommendedUnits} units for ${scope} over ${spec.horizonMonths} month(s): ${projectedDemand} projected demand + ${safetyStock} (20% safety stock).`,
      },
      explanation: `Aggregated ${spec.metric} by month (${periods.length} historical months) for ${scope}, then applied ${strategy.method.replace('_', ' ')} to project ${spec.horizonMonths} month(s). Forecasts are floored at 0 and rounded to whole units.`,
    };
  }
}

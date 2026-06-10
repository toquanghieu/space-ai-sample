import type {
  OrderRecord,
  QuerySpec,
  Metric,
  Dimension,
  Filters,
  TimeGrain,
  ResultRow,
} from '@logi/shared';
import { deliveryDays } from './kpi';

/** Pure predicate-based filtering — the deterministic substitute for a SQL WHERE clause. */
export function applyFilters(rows: readonly OrderRecord[], f: Filters = {}): OrderRecord[] {
  return rows.filter((r) => {
    if (f.status && !f.status.includes(r.status)) return false;
    if (f.carrier && !f.carrier.includes(r.carrier)) return false;
    if (f.region && !f.region.includes(r.region)) return false;
    if (f.product_category && !f.product_category.includes(r.product_category)) return false;
    if (f.sku && !f.sku.includes(r.sku)) return false;
    if (typeof f.is_promo === 'boolean' && r.is_promo !== f.is_promo) return false;
    if (f.dateFrom && r.order_date < f.dateFrom) return false;
    if (f.dateTo && r.order_date > f.dateTo) return false;
    return true;
  });
}

/** Bucket an ISO date into a sortable period key for the given grain. */
export function timeBucket(isoDate: string, grain: TimeGrain): string {
  if (grain === 'day') return isoDate;
  if (grain === 'month') return isoDate.slice(0, 7);
  // ISO-8601 week number
  const d = new Date(isoDate + 'T00:00:00Z');
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((d.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    );
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function aggregate(group: OrderRecord[], metrics: Metric[]): Record<Metric, number> {
  const delivered = group.filter((r) => r.status === 'delivered').length;
  const delayed = group.filter((r) => r.status === 'delayed').length;
  const final = delivered + delayed;
  const durations = group
    .filter((r) => (r.status === 'delivered' || r.status === 'delayed') && r.delivery_date)
    .map(deliveryDays)
    .filter((n): n is number => n !== null);

  const out = {} as Record<Metric, number>;
  for (const m of metrics) {
    switch (m) {
      case 'order_count':
        out[m] = group.length;
        break;
      case 'delivered_count':
        out[m] = delivered;
        break;
      case 'delayed_count':
        out[m] = delayed;
        break;
      case 'on_time_rate':
        out[m] = final === 0 ? 0 : delivered / final;
        break;
      case 'avg_delivery_days':
        out[m] =
          durations.length === 0 ? 0 : durations.reduce((a, b) => a + b, 0) / durations.length;
        break;
      case 'total_quantity':
        out[m] = group.reduce((a, r) => a + r.quantity, 0);
        break;
      case 'total_order_value':
        out[m] = group.reduce((a, r) => a + r.order_value_usd, 0);
        break;
    }
  }
  return out;
}

export interface QueryEngineResult {
  rows: ResultRow[];
  dimensions: Dimension[];
}

/**
 * Execute a structured QuerySpec against the rows: filter -> group -> aggregate
 * -> sort -> limit. No SQL is generated or executed at any point.
 */
export function runQuery(allRows: readonly OrderRecord[], spec: QuerySpec): QueryEngineResult {
  const filtered = applyFilters(allRows, spec.filters);
  const dims = spec.groupBy ?? [];
  const hasTime = !!spec.timeGrain;

  if (dims.length === 0 && !hasTime) {
    return { rows: [{ ...aggregate(filtered, spec.metrics) }], dimensions: dims };
  }

  const groups = new Map<string, { keyParts: Record<string, string>; rows: OrderRecord[] }>();
  for (const r of filtered) {
    const keyParts: Record<string, string> = {};
    for (const d of dims) keyParts[d] = String(r[d]);
    if (hasTime) keyParts.period = timeBucket(r.order_date, spec.timeGrain!);
    const key = JSON.stringify(keyParts);
    if (!groups.has(key)) groups.set(key, { keyParts, rows: [] });
    groups.get(key)!.rows.push(r);
  }

  let out: ResultRow[] = [];
  for (const { keyParts, rows } of groups.values()) {
    out.push({ ...keyParts, ...aggregate(rows, spec.metrics) });
  }

  if (spec.sortBy) {
    const dir = spec.sortDir === 'asc' ? 1 : -1;
    out.sort((a, b) => ((a[spec.sortBy!] as number) - (b[spec.sortBy!] as number)) * dir);
  } else if (hasTime) {
    out.sort((a, b) => String(a.period).localeCompare(String(b.period)));
  }
  if (spec.limit) out = out.slice(0, spec.limit);

  return { rows: out, dimensions: dims };
}

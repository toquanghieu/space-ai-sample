import type { OrderRecord, DashboardKpis } from '@logi/shared';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole-day difference between order_date and delivery_date, or null. */
export function deliveryDays(r: OrderRecord): number | null {
  if (!r.delivery_date) return null;
  const o = Date.parse(r.order_date);
  const d = Date.parse(r.delivery_date);
  if (Number.isNaN(o) || Number.isNaN(d)) return null;
  return Math.round((d - o) / DAY_MS);
}

/** A row counts toward delivery-time / on-time stats only if it has a final outcome. */
function isFinal(r: OrderRecord): boolean {
  return r.status === 'delivered' || r.status === 'delayed';
}

/**
 * KPI computations per the frozen contract (see README "Data Correctness"):
 * - on-time rate = delivered / (delivered + delayed); non-final statuses excluded.
 * - avg delivery days over final rows that have a delivery_date.
 */
export function computeKpis(rows: readonly OrderRecord[]): DashboardKpis {
  const totalOrders = rows.length;
  const deliveredOrders = rows.filter((r) => r.status === 'delivered').length;
  const delayedOrders = rows.filter((r) => r.status === 'delayed').length;
  const finalCount = deliveredOrders + delayedOrders;
  const onTimeDeliveryRate = finalCount === 0 ? 0 : deliveredOrders / finalCount;

  const durations = rows
    .filter((r) => isFinal(r) && r.delivery_date)
    .map(deliveryDays)
    .filter((n): n is number => n !== null);
  const avgDeliveryDays =
    durations.length === 0 ? 0 : durations.reduce((a, b) => a + b, 0) / durations.length;

  return { totalOrders, deliveredOrders, delayedOrders, onTimeDeliveryRate, avgDeliveryDays };
}

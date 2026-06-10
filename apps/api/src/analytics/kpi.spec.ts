import { computeKpis, deliveryDays } from './kpi';
import type { OrderRecord } from '@logi/shared';

const row = (p: Partial<OrderRecord>): OrderRecord => ({
  client_id: 'C',
  order_id: 'O',
  order_date: '2025-01-01',
  delivery_date: '2025-01-04',
  carrier: 'X',
  origin_city: 'A',
  destination_city: 'B',
  status: 'delivered',
  sku: 'S',
  product_category: 'P',
  quantity: 1,
  unit_price_usd: 1,
  order_value_usd: 1,
  is_promo: false,
  promo_discount_pct: 0,
  region: 'R',
  warehouse: 'W',
  ...p,
});

describe('kpi', () => {
  it('computes delivery days as the date diff', () => {
    expect(deliveryDays(row({ order_date: '2025-01-01', delivery_date: '2025-01-04' }))).toBe(3);
  });

  it('returns null delivery days when delivery_date is missing', () => {
    expect(deliveryDays(row({ delivery_date: null }))).toBeNull();
  });

  it('on-time rate excludes non-final statuses; avg ignores null delivery_date', () => {
    const rows = [
      row({ status: 'delivered', order_date: '2025-01-01', delivery_date: '2025-01-03' }), // 2d
      row({ status: 'delayed', order_date: '2025-01-01', delivery_date: '2025-01-06' }), // 5d
      row({ status: 'in_transit', delivery_date: null }),
      row({ status: 'canceled', delivery_date: null }),
    ];
    const k = computeKpis(rows);
    expect(k.totalOrders).toBe(4);
    expect(k.deliveredOrders).toBe(1);
    expect(k.delayedOrders).toBe(1);
    expect(k.onTimeDeliveryRate).toBeCloseTo(0.5); // 1 / (1+1)
    expect(k.avgDeliveryDays).toBeCloseTo(3.5); // (2+5)/2
  });

  it('returns 0 rate and 0 avg when no final orders', () => {
    const k = computeKpis([row({ status: 'in_transit', delivery_date: null })]);
    expect(k.onTimeDeliveryRate).toBe(0);
    expect(k.avgDeliveryDays).toBe(0);
  });
});

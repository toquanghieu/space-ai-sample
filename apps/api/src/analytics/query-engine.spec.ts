import { runQuery, applyFilters, timeBucket } from './query-engine';
import type { OrderRecord, QuerySpec } from '@logi/shared';

const row = (p: Partial<OrderRecord>): OrderRecord => ({
  client_id: 'C',
  order_id: 'O',
  order_date: '2025-01-01',
  delivery_date: '2025-01-04',
  carrier: 'FedEx',
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
  region: 'US-E',
  warehouse: 'W',
  ...p,
});

describe('query-engine', () => {
  it('filters by status and date range inclusively', () => {
    const rows = [
      row({ order_date: '2025-01-05', status: 'delayed' }),
      row({ order_date: '2025-02-05', status: 'delivered' }),
      row({ order_date: '2025-03-05', status: 'delayed' }),
    ];
    const out = applyFilters(rows, {
      status: ['delayed'],
      dateFrom: '2025-01-01',
      dateTo: '2025-02-28',
    });
    expect(out.length).toBe(1);
    expect(out[0].order_date).toBe('2025-01-05');
  });

  it('buckets dates by month, day and week', () => {
    expect(timeBucket('2025-03-17', 'month')).toBe('2025-03');
    expect(timeBucket('2025-03-17', 'day')).toBe('2025-03-17');
    expect(timeBucket('2025-01-01', 'week')).toMatch(/^2025-W\d{2}$/);
  });

  it('groups by carrier and computes delayed_count + on_time_rate', () => {
    const rows = [
      row({ carrier: 'FedEx', status: 'delayed' }),
      row({ carrier: 'FedEx', status: 'delivered' }),
      row({ carrier: 'UPS', status: 'delivered' }),
    ];
    const spec: QuerySpec = {
      metrics: ['order_count', 'delayed_count', 'on_time_rate'],
      groupBy: ['carrier'],
      sortBy: 'delayed_count',
      sortDir: 'desc',
    };
    const { rows: out } = runQuery(rows, spec);
    expect(out[0].carrier).toBe('FedEx');
    expect(out[0].delayed_count).toBe(1);
    expect(out[0].on_time_rate).toBeCloseTo(0.5);
    const ups = out.find((r) => r.carrier === 'UPS')!;
    expect(ups.on_time_rate).toBe(1);
  });

  it('supports time grain grouping producing a sorted period key', () => {
    const rows = [
      row({ order_date: '2025-01-10' }),
      row({ order_date: '2025-01-20' }),
      row({ order_date: '2025-02-02' }),
    ];
    const { rows: out } = runQuery(rows, { metrics: ['order_count'], timeGrain: 'month' });
    expect(out).toEqual([
      { period: '2025-01', order_count: 2 },
      { period: '2025-02', order_count: 1 },
    ]);
  });
});

import { InMemoryOrderRepository } from './in-memory-order.repository';

describe('InMemoryOrderRepository', () => {
  const repo = new InMemoryOrderRepository();
  beforeAll(() => repo.onModuleInit());

  it('loads all 400 rows', () => {
    expect(repo.findAll().length).toBe(400);
  });

  it('parses numbers and booleans, and nulls empty delivery_date', () => {
    const rows = repo.findAll();
    const withNullDelivery = rows.filter((r) => r.delivery_date === null);
    expect(withNullDelivery.length).toBe(30);
    const r = rows[0];
    expect(typeof r.quantity).toBe('number');
    expect(typeof r.order_value_usd).toBe('number');
    expect(typeof r.is_promo).toBe('boolean');
  });

  it('only contains the five known statuses', () => {
    const statuses = new Set(repo.findAll().map((r) => r.status));
    expect([...statuses].sort()).toEqual(
      ['canceled', 'delayed', 'delivered', 'exception', 'in_transit'].sort(),
    );
  });
});

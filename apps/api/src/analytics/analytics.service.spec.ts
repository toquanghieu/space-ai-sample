import { InMemoryOrderRepository } from '../dataset/in-memory-order.repository';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService (real dataset)', () => {
  let svc: AnalyticsService;
  beforeAll(() => {
    const repo = new InMemoryOrderRepository();
    repo.onModuleInit();
    svc = new AnalyticsService(repo);
  });

  it('dashboard KPIs match known dataset counts', () => {
    const k = svc.dashboard().kpis;
    expect(k.totalOrders).toBe(400);
    expect(k.deliveredOrders).toBe(304);
    expect(k.delayedOrders).toBe(55);
    expect(k.onTimeDeliveryRate).toBeCloseTo(304 / 359);
  });

  it('dashboard returns three populated charts', () => {
    const charts = svc.dashboard().charts;
    expect(charts.volumeOverTime.chart.type).toBe('line');
    expect(charts.volumeOverTime.rows.length).toBeGreaterThan(0);
    expect(charts.carrierBreakdown.chart.type).toBe('bar');
  });

  it('query tool returns rows + chart + explanation with applied filters', () => {
    const res = svc.query({
      metrics: ['delayed_count'],
      groupBy: ['carrier'],
      sortBy: 'delayed_count',
      sortDir: 'desc',
    });
    expect(res.rows.length).toBeGreaterThan(0);
    expect(res.chart.type).toBe('bar');
    expect(res.explanation.metrics).toContain('delayed_count');
    expect(res.explanation.dimensions).toContain('carrier');
    expect(res.explanation.rowCount).toBe(res.rows.length);
    expect(typeof res.explanation.interpretation).toBe('string');
  });
});

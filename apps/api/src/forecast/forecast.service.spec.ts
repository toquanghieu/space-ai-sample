import { InMemoryOrderRepository } from '../dataset/in-memory-order.repository';
import { ForecastService } from './forecast.service';
import { ForecastStrategyFactory } from './forecast-strategy.factory';
import { LinearRegressionStrategy } from './strategies/linear-regression.strategy';
import { MovingAverageStrategy } from './strategies/moving-average.strategy';
import { ExponentialSmoothingStrategy } from './strategies/exponential-smoothing.strategy';

describe('ForecastService (real dataset)', () => {
  let svc: ForecastService;
  beforeAll(() => {
    const repo = new InMemoryOrderRepository();
    repo.onModuleInit();
    const factory = new ForecastStrategyFactory(
      new LinearRegressionStrategy(),
      new MovingAverageStrategy(3),
      new ExponentialSmoothingStrategy(0.5, 0.2),
    );
    svc = new ForecastService(repo, factory);
  });

  it('single forecast: history + forecast months on one aligned series', () => {
    const res = svc.forecast({
      metric: 'total_quantity',
      horizonMonths: 3,
      method: 'linear_regression',
    });
    expect(res.groups.length).toBe(1);
    expect(res.seriesKeys).toEqual(['All products']);
    // 12 historical months + 3 forecast months
    expect(res.rows.length).toBe(15);
    expect(res.forecastStartPeriod).toBe('2026-01');
    const rec = res.groups[0].recommendation;
    expect(rec.recommendedUnits).toBeGreaterThanOrEqual(rec.projectedDemand);
    expect(res.method).toBe('linear_regression');
  });

  it('grouped forecast: one line per product category', () => {
    const res = svc.forecast({
      metric: 'total_quantity',
      horizonMonths: 6,
      groupBy: 'product_category',
    });
    expect(res.groupBy).toBe('product_category');
    expect(res.seriesKeys.length).toBe(8); // 8 product categories
    expect(res.groups.length).toBe(8);
    // every row carries a value for every series key
    for (const row of res.rows) {
      for (const k of res.seriesKeys) expect(typeof row[k]).toBe('number');
    }
    // 6 forecast months appended
    expect(res.rows.filter((r) => r.period > '2025-12').length).toBe(6);
  });

  it('respects a product_category filter on the single series', () => {
    const res = svc.forecast({
      metric: 'order_count',
      horizonMonths: 2,
      method: 'moving_average',
      filters: { product_category: ['CRAYON'] },
    });
    expect(res.method).toBe('moving_average');
    expect(res.seriesKeys).toEqual(['CRAYON']);
    expect(res.rows.filter((r) => r.period > '2025-12').length).toBe(2);
  });
});

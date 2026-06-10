import { InMemoryOrderRepository } from '../dataset/in-memory-order.repository';
import { ForecastService } from './forecast.service';
import { ForecastStrategyFactory } from './forecast-strategy.factory';
import { LinearRegressionStrategy } from './strategies/linear-regression.strategy';
import { MovingAverageStrategy } from './strategies/moving-average.strategy';

describe('ForecastService (real dataset)', () => {
  let svc: ForecastService;
  beforeAll(() => {
    const repo = new InMemoryOrderRepository();
    repo.onModuleInit();
    const factory = new ForecastStrategyFactory(
      new LinearRegressionStrategy(),
      new MovingAverageStrategy(3),
    );
    svc = new ForecastService(repo, factory);
  });

  it('returns history + forecast points and an inventory recommendation', () => {
    const res = svc.forecast({
      metric: 'total_quantity',
      horizonMonths: 3,
      method: 'linear_regression',
    });
    const history = res.series.filter((p) => p.kind === 'history');
    const forecast = res.series.filter((p) => p.kind === 'forecast');
    expect(history.length).toBeGreaterThan(0);
    expect(forecast.length).toBe(3);
    expect(res.inventoryRecommendation.recommendedUnits).toBeGreaterThanOrEqual(
      res.inventoryRecommendation.projectedDemand,
    );
    expect(res.method).toBe('linear_regression');
    expect(res.explanation.length).toBeGreaterThan(0);
  });

  it('respects a product_category filter and a moving-average method', () => {
    const res = svc.forecast({
      metric: 'order_count',
      horizonMonths: 2,
      method: 'moving_average',
      filters: { product_category: ['CRAYON'] },
    });
    expect(res.method).toBe('moving_average');
    expect(res.series.filter((p) => p.kind === 'forecast').length).toBe(2);
  });
});

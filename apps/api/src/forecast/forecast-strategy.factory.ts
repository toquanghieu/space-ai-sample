import { Injectable } from '@nestjs/common';
import type { ForecastMethod } from '@logi/shared';
import type { ForecastStrategy } from '../domain/ports';
import { LinearRegressionStrategy } from './strategies/linear-regression.strategy';
import { MovingAverageStrategy } from './strategies/moving-average.strategy';

/**
 * Factory pattern: resolves the {@link ForecastStrategy} for a requested method.
 * Adding a new forecasting method means registering one strategy here — the
 * forecast service stays closed for modification (OCP).
 */
@Injectable()
export class ForecastStrategyFactory {
  private readonly registry: Map<ForecastMethod, ForecastStrategy>;

  constructor(
    linearRegression: LinearRegressionStrategy,
    movingAverage: MovingAverageStrategy,
  ) {
    this.registry = new Map<ForecastMethod, ForecastStrategy>([
      [linearRegression.method, linearRegression],
      [movingAverage.method, movingAverage],
    ]);
  }

  create(method: ForecastMethod): ForecastStrategy {
    const strategy = this.registry.get(method);
    if (!strategy) throw new Error(`Unknown forecast method: ${method}`);
    return strategy;
  }
}

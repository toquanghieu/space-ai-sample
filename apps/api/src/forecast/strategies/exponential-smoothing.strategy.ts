import { Injectable } from '@nestjs/common';
import type { ForecastMethod } from '@logi/shared';
import type { ForecastStrategy } from '../../domain/ports';

/**
 * Holt's linear exponential smoothing (double exponential smoothing).
 *
 * It decomposes the series into a smoothed LEVEL and TREND that are updated each
 * period, weighting recent observations more (alpha) than older ones — so an old
 * outlier fades instead of dragging the whole trend (the weakness of plain OLS).
 * Forecast h steps ahead = level + h * trend.
 *
 *   level_t = alpha * y_t        + (1 - alpha) * (level_{t-1} + trend_{t-1})
 *   trend_t = beta  * (level_t - level_{t-1}) + (1 - beta)  *  trend_{t-1}
 */
@Injectable()
export class ExponentialSmoothingStrategy implements ForecastStrategy {
  readonly method: ForecastMethod = 'exponential_smoothing';

  constructor(
    private readonly alpha = 0.5,
    private readonly beta = 0.2,
  ) {}

  forecast(history: number[], horizon: number): number[] {
    const n = history.length;
    if (n === 0) return Array<number>(horizon).fill(0);
    if (n === 1) return Array<number>(horizon).fill(Math.max(0, Math.round(history[0])));

    let level = history[0];
    let trend = 0; // start flat so an outlier first month doesn't seed a huge slope
    for (let t = 1; t < n; t++) {
      const prevLevel = level;
      level = this.alpha * history[t] + (1 - this.alpha) * (level + trend);
      trend = this.beta * (level - prevLevel) + (1 - this.beta) * trend;
    }

    const out: number[] = [];
    for (let h = 1; h <= horizon; h++) out.push(Math.max(0, Math.round(level + h * trend)));
    return out;
  }
}

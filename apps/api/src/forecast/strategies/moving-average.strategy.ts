import { Injectable } from '@nestjs/common';
import type { ForecastMethod } from '@logi/shared';
import type { ForecastStrategy } from '../../domain/ports';

/**
 * Trailing-window moving average. Each forecast step averages the last
 * `window` values (including previously forecast points), floored at 0.
 */
@Injectable()
export class MovingAverageStrategy implements ForecastStrategy {
  readonly method: ForecastMethod = 'moving_average';

  constructor(private readonly window = 3) {}

  forecast(history: number[], horizon: number): number[] {
    const series = history.slice();
    const out: number[] = [];
    for (let h = 0; h < horizon; h++) {
      const w = series.slice(-this.window);
      const avg = w.length ? Math.round(w.reduce((a, b) => a + b, 0) / w.length) : 0;
      const value = Math.max(0, avg);
      out.push(value);
      series.push(value);
    }
    return out;
  }
}

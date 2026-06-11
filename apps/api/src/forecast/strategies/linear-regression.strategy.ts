import { Injectable } from '@nestjs/common';
import type { ForecastMethod } from '@logi/shared';
import type { ForecastStrategy } from '../../domain/ports';

/**
 * Ordinary least-squares linear trend, extrapolated forward. Forecasts are
 * floored at 0 and rounded to whole units (demand cannot be negative/fractional).
 */
@Injectable()
export class LinearRegressionStrategy implements ForecastStrategy {
  readonly method: ForecastMethod = 'linear_regression';

  forecast(history: number[], horizon: number): number[] {
    const n = history.length;
    if (n === 0) return Array<number>(horizon).fill(0);
    if (n === 1) return Array<number>(horizon).fill(Math.max(0, Math.round(history[0])));

    const xs = history.map((_, i) => i);
    const meanX = xs.reduce((a, b) => a + b, 0) / n;
    const meanY = history.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (xs[i] - meanX) * (history[i] - meanY);
      den += (xs[i] - meanX) ** 2;
    }
    const slope = den === 0 ? 0 : num / den;
    const intercept = meanY - slope * meanX;

    const out: number[] = [];
    for (let h = 1; h <= horizon; h++) {
      out.push(Math.max(0, Math.round(intercept + slope * (n - 1 + h))));
    }
    return out;
  }
}

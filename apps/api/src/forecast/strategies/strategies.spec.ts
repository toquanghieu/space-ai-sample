import { LinearRegressionStrategy } from './linear-regression.strategy';
import { MovingAverageStrategy } from './moving-average.strategy';
import { ExponentialSmoothingStrategy } from './exponential-smoothing.strategy';

describe('forecast strategies', () => {
  const linear = new LinearRegressionStrategy();
  const moving = new MovingAverageStrategy(3);
  const expo = new ExponentialSmoothingStrategy(0.5, 0.2);

  it('linear regression extrapolates a perfect upward trend', () => {
    const fc = linear.forecast([10, 20, 30, 40], 2); // slope 10
    expect(fc[0]).toBeCloseTo(50);
    expect(fc[1]).toBeCloseTo(60);
  });

  it('linear regression never returns negative forecasts', () => {
    const fc = linear.forecast([5, 3, 1], 3); // slope -2 would go negative
    expect(Math.min(...fc)).toBeGreaterThanOrEqual(0);
  });

  it('moving average forecasts the rounded mean of the trailing window', () => {
    const fc = moving.forecast([4, 6, 8, 10], 2); // window 3 -> mean(6,8,10)=8
    expect(fc[0]).toBe(8);
    // series is now [4,6,8,10,8]; step 2 = round(mean(8,10,8)) = round(8.67) = 9
    expect(fc[1]).toBe(9);
  });

  it('exponential smoothing tracks an upward trend and weights recent data', () => {
    const fc = expo.forecast([10, 20, 30, 40], 2);
    expect(fc[0]).toBeGreaterThan(30); // continues upward from recent level
    expect(fc[1]).toBeGreaterThanOrEqual(fc[0]); // trend keeps rising
    expect(Math.min(...fc)).toBeGreaterThanOrEqual(0);
  });

  it('exponential smoothing lets an early outlier fade (not dragged like OLS)', () => {
    const series = [200, 30, 32, 28, 31, 29]; // big spike then ~30
    const fc = expo.forecast(series, 1);
    expect(fc[0]).toBeLessThan(60); // close to recent ~30, not pulled toward 200
  });

  it('exposes the correct method tag', () => {
    expect(linear.method).toBe('linear_regression');
    expect(moving.method).toBe('moving_average');
    expect(expo.method).toBe('exponential_smoothing');
  });
});

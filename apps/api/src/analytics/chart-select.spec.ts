import { selectChart } from './chart-select';
import type { QuerySpec } from '@logi/shared';

describe('selectChart', () => {
  it('uses a line chart for time-grain queries', () => {
    const spec: QuerySpec = { metrics: ['order_count'], timeGrain: 'month' };
    const c = selectChart(spec);
    expect(c.type).toBe('line');
    expect(c.xKey).toBe('period');
    expect(c.yKeys).toEqual(['order_count']);
  });

  it('uses a bar chart for a single-dimension breakdown', () => {
    const spec: QuerySpec = { metrics: ['delayed_count'], groupBy: ['carrier'] };
    const c = selectChart(spec);
    expect(c.type).toBe('bar');
    expect(c.xKey).toBe('carrier');
  });

  it('returns none when there is no dimension or time axis', () => {
    expect(selectChart({ metrics: ['order_count'] }).type).toBe('none');
  });
});

import type { QuerySpec, ChartSpec } from '@logi/shared';

/**
 * Deterministic chart-type selection based on the query shape — the chart is
 * never hallucinated by the LLM. Time-series -> line, single-dimension
 * breakdown -> bar, scalar -> none.
 */
export function selectChart(spec: QuerySpec): ChartSpec {
  const yKeys = spec.metrics.slice();
  const title = spec.metrics.join(', ');
  if (spec.timeGrain) {
    return { type: 'line', xKey: 'period', yKeys, title: `${title} over time` };
  }
  if (spec.groupBy && spec.groupBy.length > 0) {
    return { type: 'bar', xKey: spec.groupBy[0], yKeys, title: `${title} by ${spec.groupBy[0]}` };
  }
  return { type: 'none', xKey: '', yKeys, title };
}

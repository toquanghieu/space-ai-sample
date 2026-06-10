import { Injectable } from '@nestjs/common';
import { QuerySpecSchema } from '@logi/shared';
import type { QueryResult } from '@logi/shared';
import type { AnalyticalTool, ToolDefinition, ToolExecution } from '../../domain/ports';
import { AnalyticsService } from '../../analytics/analytics.service';

/**
 * `query_analytics` AI tool. Validates the LLM's structured args with Zod, then
 * delegates to the deterministic AnalyticsService. The LLM never computes.
 */
@Injectable()
export class QueryAnalyticsTool implements AnalyticalTool {
  constructor(private readonly analytics: AnalyticsService) {}

  readonly definition: ToolDefinition = {
    name: 'query_analytics',
    description:
      'Compute aggregated logistics analytics (KPIs, breakdowns, time series) from the dataset. Use for any descriptive/diagnostic question about orders, delays, carriers, regions, categories, or delivery performance. Do NOT use for predicting the future.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        metrics: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'string',
            enum: [
              'order_count',
              'delivered_count',
              'delayed_count',
              'on_time_rate',
              'avg_delivery_days',
              'total_quantity',
              'total_order_value',
            ],
          },
        },
        groupBy: {
          type: 'array',
          items: {
            type: 'string',
            enum: [
              'carrier',
              'region',
              'destination_city',
              'product_category',
              'status',
              'warehouse',
              'client_id',
              'sku',
            ],
          },
        },
        timeGrain: {
          type: 'string',
          enum: ['day', 'week', 'month'],
          description: 'Bucket order_date into periods for time-series questions.',
        },
        filters: {
          type: 'object',
          additionalProperties: false,
          properties: {
            status: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['delivered', 'delayed', 'in_transit', 'exception', 'canceled'],
              },
            },
            carrier: { type: 'array', items: { type: 'string' } },
            region: { type: 'array', items: { type: 'string' } },
            product_category: { type: 'array', items: { type: 'string' } },
            sku: { type: 'array', items: { type: 'string' } },
            is_promo: { type: 'boolean' },
            dateFrom: { type: 'string', description: 'Inclusive ISO date yyyy-mm-dd.' },
            dateTo: { type: 'string', description: 'Inclusive ISO date yyyy-mm-dd.' },
          },
        },
        sortBy: {
          type: 'string',
          enum: [
            'order_count',
            'delivered_count',
            'delayed_count',
            'on_time_rate',
            'avg_delivery_days',
            'total_quantity',
            'total_order_value',
          ],
        },
        sortDir: { type: 'string', enum: ['asc', 'desc'] },
        limit: { type: 'integer', minimum: 1, maximum: 100 },
      },
      required: ['metrics'],
    },
  };

  run(rawArgs: unknown): ToolExecution {
    const spec = QuerySpecSchema.parse(rawArgs); // throws ZodError -> 400, never executed
    const result = this.analytics.query(spec);
    return { tool: 'query_analytics', query: result, answer: this.summarize(result) };
  }

  private summarize(r: QueryResult): string {
    if (r.rows.length === 0) return 'No matching records were found for that query.';
    const isScalar =
      r.rows.length === 1 && r.explanation.dimensions.length === 0 && !r.explanation.timeGrain;
    if (isScalar) {
      return Object.entries(r.rows[0])
        .map(([k, v]) => `${k}: ${typeof v === 'number' ? Number(v.toFixed(2)) : v}`)
        .join(', ');
    }
    const top = r.rows[0];
    const dim = r.explanation.dimensions[0] ?? 'period';
    const metric = r.explanation.metrics[0];
    const value = top[metric];
    return `Returned ${r.rows.length} rows. Top ${dim}: ${top[dim]} (${metric} = ${
      typeof value === 'number' ? Number(value.toFixed(2)) : value
    }). See the chart and table below.`;
  }
}

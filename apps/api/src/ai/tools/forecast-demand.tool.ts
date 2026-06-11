import { Injectable } from '@nestjs/common';
import { ForecastSpecSchema } from '@logi/shared';
import type { ForecastResult } from '@logi/shared';
import type { AnalyticalTool, ToolDefinition, ToolExecution } from '../../domain/ports';
import { ForecastService } from '../../forecast/forecast.service';
import { unflattenLlmArgs } from '../normalize-args';

/**
 * `forecast_demand` AI tool. Validates the LLM's structured args with Zod, then
 * delegates to the deterministic ForecastService.
 */
@Injectable()
export class ForecastDemandTool implements AnalyticalTool {
  constructor(private readonly forecast: ForecastService) {}

  readonly definition: ToolDefinition = {
    name: 'forecast_demand',
    description:
      'Predict future demand and recommend inventory. Use ONLY for forward-looking questions like "predict demand for SKU X next 4 months" or "how much inventory should I plan". To forecast EACH product/carrier/region separately (one line per type), set groupBy.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        metric: { type: 'string', enum: ['total_quantity', 'order_count'] },
        horizonMonths: { type: 'integer', minimum: 1, maximum: 12 },
        method: { type: 'string', enum: ['moving_average', 'linear_regression'] },
        groupBy: {
          type: 'string',
          enum: ['product_category', 'carrier', 'region', 'sku'],
          description:
            'Break the forecast into one line per value of this dimension. Use product_category when the user asks to forecast "each product / all products / per category".',
        },
        filters: {
          type: 'object',
          additionalProperties: false,
          properties: {
            sku: {
              type: 'array',
              description:
                'Specific SKU code such as "PENCIL-0076". For a general product name (e.g. "pencil"/"bút chì"), use product_category instead, NOT sku.',
              items: { type: 'string' },
            },
            product_category: {
              type: 'array',
              description: 'General product family.',
              items: {
                type: 'string',
                enum: [
                  'BOOK',
                  'BRUSH',
                  'CRAYON',
                  'MARKER',
                  'PAINT',
                  'PAPER',
                  'PENCIL',
                  'STICKER',
                ],
              },
            },
            region: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      required: ['metric', 'horizonMonths'],
    },
  };

  run(rawArgs: unknown): ToolExecution {
    const spec = ForecastSpecSchema.parse(unflattenLlmArgs(rawArgs));
    const result = this.forecast.forecast(spec);
    return { tool: 'forecast_demand', forecast: result, answer: this.summarize(result) };
  }

  private summarize(r: ForecastResult): string {
    if (r.groups.length === 1) return r.groups[0].recommendation.rationale;
    const top = [...r.groups].sort(
      (a, b) => b.recommendation.recommendedUnits - a.recommendation.recommendedUnits,
    )[0];
    const horizon = r.groups[0]?.recommendation.horizonMonths ?? 0;
    return `Forecast for ${r.groups.length} ${r.groupBy ?? 'series'} over ${horizon} month(s). Highest demand: ${top.label} (~${top.recommendation.recommendedUnits} units recommended). See per-series recommendations below.`;
  }
}

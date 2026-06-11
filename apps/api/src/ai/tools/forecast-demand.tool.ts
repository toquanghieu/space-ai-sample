import { Injectable } from '@nestjs/common';
import { ForecastSpecSchema } from '@logi/shared';
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
      'Predict future demand and recommend inventory. Use ONLY for forward-looking questions like "predict demand for SKU X next 4 months" or "how much inventory should I plan".',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        metric: { type: 'string', enum: ['total_quantity', 'order_count'] },
        horizonMonths: { type: 'integer', minimum: 1, maximum: 12 },
        method: { type: 'string', enum: ['moving_average', 'linear_regression'] },
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
    return {
      tool: 'forecast_demand',
      forecast: result,
      answer: result.inventoryRecommendation.rationale,
    };
  }
}

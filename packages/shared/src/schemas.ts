import { z } from 'zod';

export const FiltersSchema = z
  .object({
    status: z
      .array(z.enum(['delivered', 'delayed', 'in_transit', 'exception', 'canceled']))
      .optional(),
    carrier: z.array(z.string()).optional(),
    region: z.array(z.string()).optional(),
    product_category: z.array(z.string()).optional(),
    sku: z.array(z.string()).optional(),
    is_promo: z.boolean().optional(),
    dateFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    dateTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .strip();

export const QuerySpecSchema = z
  .object({
    metrics: z
      .array(
        z.enum([
          'order_count',
          'delivered_count',
          'delayed_count',
          'on_time_rate',
          'avg_delivery_days',
          'total_quantity',
          'total_order_value',
        ]),
      )
      .min(1),
    groupBy: z
      .array(
        z.enum([
          'carrier',
          'region',
          'destination_city',
          'product_category',
          'status',
          'warehouse',
          'client_id',
          'sku',
        ]),
      )
      .optional(),
    timeGrain: z.enum(['day', 'week', 'month']).optional(),
    filters: FiltersSchema.optional(),
    sortBy: z
      .enum([
        'order_count',
        'delivered_count',
        'delayed_count',
        'on_time_rate',
        'avg_delivery_days',
        'total_quantity',
        'total_order_value',
      ])
      .optional(),
    sortDir: z.enum(['asc', 'desc']).optional(),
    limit: z.number().int().positive().max(100).optional(),
  })
  .strip();

export const AskRequestSchema = z
  .object({
    question: z.string().trim().min(1, 'question must not be empty').max(1000),
  })
  .strip();

export const ForecastSpecSchema = z
  .object({
    metric: z.enum(['total_quantity', 'order_count']),
    filters: FiltersSchema.optional(),
    horizonMonths: z.number().int().min(1).max(12),
    method: z.enum(['moving_average', 'linear_regression', 'exponential_smoothing']).optional(),
    groupBy: z.enum(['product_category', 'carrier', 'region', 'sku']).optional(),
  })
  .strip();

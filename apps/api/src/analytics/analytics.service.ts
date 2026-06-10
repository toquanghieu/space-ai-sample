import { Inject, Injectable } from '@nestjs/common';
import type { QuerySpec, QueryResult, DashboardResponse } from '@logi/shared';
import { ORDER_REPOSITORY, type OrderRepository } from '../domain/ports';
import { computeKpis } from './kpi';
import { runQuery } from './query-engine';
import { selectChart } from './chart-select';
import { QueryExplanationBuilder } from './query-explanation.builder';

/**
 * Business logic for descriptive/diagnostic analytics. Depends only on the
 * OrderRepository abstraction (DIP). This is the implementation behind the
 * `query_analytics` AI tool, and also serves the dashboard.
 */
@Injectable()
export class AnalyticsService {
  constructor(@Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository) {}

  dashboard(): DashboardResponse {
    const kpis = computeKpis(this.orders.findAll());
    return {
      kpis,
      charts: {
        volumeOverTime: this.query({ metrics: ['order_count'], timeGrain: 'month' }),
        deliveryPerformance: this.query({
          metrics: ['order_count'],
          groupBy: ['status'],
          filters: { status: ['delivered', 'delayed'] },
        }),
        carrierBreakdown: this.query({
          metrics: ['order_count', 'delayed_count'],
          groupBy: ['carrier'],
          sortBy: 'order_count',
          sortDir: 'desc',
        }),
      },
    };
  }

  query(spec: QuerySpec): QueryResult {
    const { rows, dimensions } = runQuery(this.orders.findAll(), spec);
    const chart = selectChart(spec);
    const explanation = new QueryExplanationBuilder()
      .fromSpec(spec)
      .withDimensions(dimensions)
      .withRowCount(rows.length)
      .build();
    return { rows, chart, explanation };
  }
}

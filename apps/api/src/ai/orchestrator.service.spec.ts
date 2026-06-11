import { OrchestratorService } from './orchestrator.service';
import { InMemoryOrderRepository } from '../dataset/in-memory-order.repository';
import { AnalyticsService } from '../analytics/analytics.service';
import { ForecastService } from '../forecast/forecast.service';
import { ForecastStrategyFactory } from '../forecast/forecast-strategy.factory';
import { LinearRegressionStrategy } from '../forecast/strategies/linear-regression.strategy';
import { MovingAverageStrategy } from '../forecast/strategies/moving-average.strategy';
import { QueryAnalyticsTool } from './tools/query-analytics.tool';
import { ForecastDemandTool } from './tools/forecast-demand.tool';
import type { LlmRouter, ToolRouteDecision } from '../domain/ports';

/** Deterministic fake router — returns a fixed routing decision, no network. */
class FakeRouter implements LlmRouter {
  constructor(private readonly decision: ToolRouteDecision) {}
  async route(): Promise<ToolRouteDecision> {
    return this.decision;
  }
}

describe('OrchestratorService', () => {
  let queryTool: QueryAnalyticsTool;
  let forecastTool: ForecastDemandTool;

  beforeAll(() => {
    const repo = new InMemoryOrderRepository();
    repo.onModuleInit();
    const analytics = new AnalyticsService(repo);
    const factory = new ForecastStrategyFactory(
      new LinearRegressionStrategy(),
      new MovingAverageStrategy(3),
    );
    const forecast = new ForecastService(repo, factory);
    queryTool = new QueryAnalyticsTool(analytics);
    forecastTool = new ForecastDemandTool(forecast);
  });

  const build = (decision: ToolRouteDecision) =>
    new OrchestratorService(new FakeRouter(decision), [queryTool, forecastTool]);

  it('routes a query question to query_analytics with a computed result', async () => {
    const svc = build({
      name: 'query_analytics',
      args: { metrics: ['delayed_count'], groupBy: ['carrier'], sortBy: 'delayed_count', sortDir: 'desc' },
    });
    const res = await svc.ask('Which carrier has the highest delay count?');
    expect(res.tool).toBe('query_analytics');
    expect(res.query?.rows.length).toBeGreaterThan(0);
    expect(res.answer).toBeTruthy();
  });

  it('routes a prediction question to forecast_demand', async () => {
    const svc = build({ name: 'forecast_demand', args: { metric: 'total_quantity', horizonMonths: 4 } });
    const res = await svc.ask('Predict demand for the next 4 months');
    expect(res.tool).toBe('forecast_demand');
    expect(res.forecast?.rows.length).toBeGreaterThan(0);
    expect(res.forecast?.groups.length).toBeGreaterThan(0);
  });

  it('rejects invalid tool args instead of executing them', async () => {
    const svc = build({ name: 'query_analytics', args: { metrics: ['not_a_metric'] } });
    await expect(svc.ask('garbage')).rejects.toThrow();
  });

  it('rejects an unknown tool name from the router', async () => {
    const svc = build({ name: 'delete_everything', args: {} });
    await expect(svc.ask('do something')).rejects.toThrow(/Unknown tool/);
  });
});

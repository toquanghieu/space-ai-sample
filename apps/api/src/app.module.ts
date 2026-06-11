import { Module } from '@nestjs/common';
import { ORDER_REPOSITORY, ANALYTICAL_TOOLS, LLM_ROUTER } from './domain/ports';
import { InMemoryOrderRepository } from './dataset/in-memory-order.repository';
import { AnalyticsService } from './analytics/analytics.service';
import { AnalyticsController } from './analytics/analytics.controller';
import { ForecastService } from './forecast/forecast.service';
import { ForecastController } from './forecast/forecast.controller';
import { ForecastStrategyFactory } from './forecast/forecast-strategy.factory';
import { LinearRegressionStrategy } from './forecast/strategies/linear-regression.strategy';
import { MovingAverageStrategy } from './forecast/strategies/moving-average.strategy';
import { ExponentialSmoothingStrategy } from './forecast/strategies/exponential-smoothing.strategy';
import { OpenAiLlmRouter } from './ai/openai-llm-router';
import { OrchestratorService } from './ai/orchestrator.service';
import { AiController } from './ai/ai.controller';
import { QueryAnalyticsTool } from './ai/tools/query-analytics.tool';
import { ForecastDemandTool } from './ai/tools/forecast-demand.tool';

@Module({
  controllers: [AnalyticsController, ForecastController, AiController],
  providers: [
    // Repository port -> in-memory implementation (DIP)
    { provide: ORDER_REPOSITORY, useClass: InMemoryOrderRepository },

    // Forecasting strategies (Strategy) + factory
    LinearRegressionStrategy,
    { provide: MovingAverageStrategy, useFactory: () => new MovingAverageStrategy(3) },
    { provide: ExponentialSmoothingStrategy, useFactory: () => new ExponentialSmoothingStrategy(0.5, 0.2) },
    ForecastStrategyFactory,

    // Services
    AnalyticsService,
    ForecastService,

    // AI tools (Strategy) + registry assembled via factory (OCP)
    QueryAnalyticsTool,
    ForecastDemandTool,
    {
      provide: ANALYTICAL_TOOLS,
      useFactory: (q: QueryAnalyticsTool, f: ForecastDemandTool) => [q, f],
      inject: [QueryAnalyticsTool, ForecastDemandTool],
    },

    // LLM router port -> OpenAI implementation (DIP)
    { provide: LLM_ROUTER, useClass: OpenAiLlmRouter },

    OrchestratorService,
  ],
})
export class AppModule {}

import type {
  OrderRecord,
  ForecastMethod,
  ToolName,
  QueryResult,
  ForecastResult,
} from '@logi/shared';

/**
 * Repository port (DIP). Services depend on this abstraction, never on the
 * concrete CSV loader, so the data source can be swapped (e.g. Postgres) with
 * zero changes to business logic.
 */
export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');

export interface OrderRepository {
  findAll(): readonly OrderRecord[];
}

/**
 * Forecasting strategy port (Strategy pattern, OCP). Each numerical method is a
 * swappable strategy; adding a new method does not touch the forecast service.
 */
export interface ForecastStrategy {
  readonly method: ForecastMethod;
  /** Project `horizon` future values from a historical series. */
  forecast(history: number[], horizon: number): number[];
}

/**
 * Provider-agnostic tool definition (DIP). Tools describe themselves without
 * knowing about OpenAI; the orchestrator adapts this to the LLM provider.
 */
export interface ToolDefinition {
  name: ToolName;
  description: string;
  /** JSON-schema object describing the tool arguments. */
  parameters: Record<string, unknown>;
}

export interface ToolExecution {
  tool: ToolName;
  answer: string;
  query?: QueryResult;
  forecast?: ForecastResult;
}

/**
 * Analytical tool port (Strategy + Registry, OCP). The orchestrator routes to a
 * tool purely through this interface; adding a tool means adding a provider, not
 * editing the orchestrator.
 */
export const ANALYTICAL_TOOLS = Symbol('ANALYTICAL_TOOLS');

export interface AnalyticalTool {
  readonly definition: ToolDefinition;
  /** Validate raw LLM args, compute deterministically, return a result. */
  run(rawArgs: unknown): ToolExecution;
}

/**
 * LLM router port (DIP). Abstracts the LLM provider behind a single method that
 * picks a tool and emits raw arguments. Swapping OpenAI for another provider, or
 * mocking it in tests, requires no change to the orchestrator.
 */
export const LLM_ROUTER = Symbol('LLM_ROUTER');

export interface ToolRouteDecision {
  name: string;
  args: unknown;
}

export interface LlmRouter {
  route(question: string, tools: ToolDefinition[]): Promise<ToolRouteDecision>;
}

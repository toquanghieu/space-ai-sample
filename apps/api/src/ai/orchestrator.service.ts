import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import type { AskResponse } from '@logi/shared';
import {
  ANALYTICAL_TOOLS,
  LLM_ROUTER,
  type AnalyticalTool,
  type LlmRouter,
} from '../domain/ports';

/**
 * Orchestrates the AI flow:
 *   question -> LLM picks a tool + structured args -> registry dispatch ->
 *   deterministic tool runs (validates + computes) -> result + explanation.
 *
 * The orchestrator knows nothing about specific tools or the LLM provider — it
 * depends only on the LlmRouter and AnalyticalTool ports (DIP). New tools are
 * added by registering a provider; this class is closed for modification (OCP).
 */
@Injectable()
export class OrchestratorService {
  private readonly registry: Map<string, AnalyticalTool>;

  constructor(
    @Inject(LLM_ROUTER) private readonly router: LlmRouter,
    @Inject(ANALYTICAL_TOOLS) private readonly tools: AnalyticalTool[],
  ) {
    this.registry = new Map(tools.map((t) => [t.definition.name, t]));
  }

  async ask(question: string): Promise<AskResponse> {
    if (!question || !question.trim()) {
      throw new BadRequestException('Question must not be empty.');
    }

    const definitions = this.tools.map((t) => t.definition);
    const decision = await this.router.route(question, definitions);

    const tool = this.registry.get(decision.name);
    if (!tool) throw new BadRequestException(`Unknown tool: ${decision.name}`);

    const execution = tool.run(decision.args); // validates args (Zod) then computes
    return {
      tool: execution.tool,
      answer: execution.answer,
      query: execution.query,
      forecast: execution.forecast,
    };
  }
}

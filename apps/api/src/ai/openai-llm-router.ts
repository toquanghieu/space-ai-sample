import { Injectable, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import OpenAI from 'openai';
import type { ChatCompletionTool } from 'openai/resources/chat/completions';
import type { LlmRouter, ToolDefinition, ToolRouteDecision } from '../domain/ports';
import { SYSTEM_PROMPT } from './system-prompt';

/**
 * OpenAI implementation of the {@link LlmRouter} port. Adapts provider-agnostic
 * tool definitions to OpenAI function-calling and forces a single tool call.
 */
@Injectable()
export class OpenAiLlmRouter implements LlmRouter {
  private readonly model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  private cachedClient?: OpenAI;

  /** Lazily build the client so the app boots (and dashboard/query/forecast work) without a key. */
  private get client(): OpenAI {
    if (!this.cachedClient) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new BadRequestException(
          'OPENAI_API_KEY is not configured; the natural-language /ask endpoint is unavailable.',
        );
      }
      this.cachedClient = new OpenAI({ apiKey });
    }
    return this.cachedClient;
  }

  async route(question: string, tools: ToolDefinition[]): Promise<ToolRouteDecision> {
    const openAiTools: ChatCompletionTool[] = tools.map((t) => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }));

    let completion;
    try {
      completion = await this.client.chat.completions.create({
        model: this.model,
        temperature: 0,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: question },
        ],
        tools: openAiTools,
        tool_choice: 'required',
      });
    } catch (err) {
      throw this.toHttpError(err);
    }

    const call = completion.choices[0]?.message?.tool_calls?.[0];
    if (!call) throw new BadRequestException('Model did not select a tool.');
    return { name: call.function.name, args: JSON.parse(call.function.arguments || '{}') };
  }

  /** Map upstream OpenAI failures to a clear, non-500 response for the UI. */
  private toHttpError(err: unknown): Error {
    if (err instanceof OpenAI.APIError) {
      const detail =
        err.status === 429
          ? 'AI provider quota exceeded — add billing/credit to the OpenAI account.'
          : err.status === 401
            ? 'AI provider rejected the API key (401).'
            : `AI provider error (${err.status ?? 'network'}).`;
      return new ServiceUnavailableException(
        `Natural-language routing is temporarily unavailable: ${detail} The dashboard, /query and /forecast endpoints are unaffected.`,
      );
    }
    return err instanceof Error ? err : new Error(String(err));
  }
}

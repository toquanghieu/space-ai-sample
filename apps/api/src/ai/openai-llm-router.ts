import { Injectable, BadRequestException } from '@nestjs/common';
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
  private readonly client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  private readonly model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

  async route(question: string, tools: ToolDefinition[]): Promise<ToolRouteDecision> {
    const openAiTools: ChatCompletionTool[] = tools.map((t) => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }));

    const completion = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: question },
      ],
      tools: openAiTools,
      tool_choice: 'required',
    });

    const call = completion.choices[0]?.message?.tool_calls?.[0];
    if (!call) throw new BadRequestException('Model did not select a tool.');
    return { name: call.function.name, args: JSON.parse(call.function.arguments || '{}') };
  }
}

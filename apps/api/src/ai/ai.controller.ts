import { Body, Controller, Post } from '@nestjs/common';
import { AskRequestSchema } from '@logi/shared';
import { OrchestratorService } from './orchestrator.service';

@Controller()
export class AiController {
  constructor(private readonly orchestrator: OrchestratorService) {}

  @Post('ask')
  ask(@Body() body: unknown) {
    const { question } = AskRequestSchema.parse(body); // ZodError -> 400 via filter
    return this.orchestrator.ask(question);
  }
}

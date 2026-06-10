import { Body, Controller, Post } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';

@Controller()
export class AiController {
  constructor(private readonly orchestrator: OrchestratorService) {}

  @Post('ask')
  ask(@Body() body: { question: string }) {
    return this.orchestrator.ask(body?.question);
  }
}

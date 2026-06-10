import { Body, Controller, Get, Post } from '@nestjs/common';
import { QuerySpecSchema } from '@logi/shared';
import { AnalyticsService } from './analytics.service';

@Controller()
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('dashboard')
  dashboard() {
    return this.analytics.dashboard();
  }

  @Post('query')
  query(@Body() body: unknown) {
    const spec = QuerySpecSchema.parse(body);
    return this.analytics.query(spec);
  }
}

import { Body, Controller, Post } from '@nestjs/common';
import { ForecastSpecSchema } from '@logi/shared';
import { ForecastService } from './forecast.service';

@Controller()
export class ForecastController {
  constructor(private readonly forecast: ForecastService) {}

  @Post('forecast')
  forecastDemand(@Body() body: unknown) {
    const spec = ForecastSpecSchema.parse(body);
    return this.forecast.forecast(spec);
  }
}

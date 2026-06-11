import type { INestApplication } from '@nestjs/common';
import { ZodExceptionFilter } from './ai/zod-exception.filter';

/** Shared app configuration used by both the local bootstrap and the serverless handler. */
export function configureApp(app: INestApplication): void {
  app.enableCors({ origin: true });
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new ZodExceptionFilter());
}

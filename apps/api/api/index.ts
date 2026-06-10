import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import serverlessExpress from '@vendia/serverless-express';
import type { Request, Response } from 'express';
import { AppModule } from '../src/app.module';
import { ZodExceptionFilter } from '../src/ai/zod-exception.filter';

let cached: ReturnType<typeof serverlessExpress> | undefined;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true });
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new ZodExceptionFilter());
  await app.init();
  return serverlessExpress({ app: app.getHttpAdapter().getInstance() });
}

export default async function handler(req: Request, res: Response) {
  cached = cached ?? (await bootstrap());
  return cached(req, res);
}

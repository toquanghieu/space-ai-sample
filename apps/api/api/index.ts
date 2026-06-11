import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import serverlessExpress from '@vendia/serverless-express';
import type { Request, Response } from 'express';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';

type Handler = ReturnType<typeof serverlessExpress>;

// Cache the in-flight promise (not the resolved handler) so concurrent cold-start
// invocations share a single Nest bootstrap instead of each building the app.
let handlerPromise: Promise<Handler> | undefined;

async function bootstrap(): Promise<Handler> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  await app.init();
  return serverlessExpress({ app: app.getHttpAdapter().getInstance() });
}

export default async function handler(req: Request, res: Response) {
  handlerPromise ??= bootstrap();
  const expressHandler = await handlerPromise;
  return expressHandler(req, res);
}

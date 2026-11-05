import * as dotenv from 'dotenv';

// Load .env from the current directory (apps/api/.env)
dotenv.config();

import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { toNodeHandler } from 'better-auth/node';
import { json, urlencoded } from 'express';
import { allowedOrigins, getAuth } from './account/auth';
import { AppModule } from './app.module';

async function bootstrap() {
  // Better Auth reads the raw body, so the parsers are added after its route.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  // Behind one proxy in production, so limits see the visitor and not the proxy.
  app.set('trust proxy', 1);
  const origins = allowedOrigins();
  app.enableCors(origins.length > 0 ? { origin: origins, credentials: true } : undefined);
  app.getHttpAdapter().getInstance().all('/api/auth/{*path}', toNodeHandler(getAuth()));
  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ extended: true }));
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();

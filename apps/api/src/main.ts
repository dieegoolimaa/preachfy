import * as dotenv from 'dotenv';
import path from 'path';

// Load .env from the current directory (apps/api/.env)
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // Enable CORS for the frontend
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();

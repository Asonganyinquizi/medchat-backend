import tracer from 'dd-trace';

tracer.init({
  service: process.env.DD_SERVICE ?? 'medical-chatbot-backend',
  env: process.env.DD_ENV ?? process.env.NODE_ENV ?? 'development',
  version: process.env.DD_VERSION,
});

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

function parseCorsOrigins(frontendUrl?: string): string[] {
  const defaults = ['http://localhost:3000'];

  if (!frontendUrl) {
    return defaults;
  }

  return Array.from(
    new Set([
      ...defaults,
      ...frontendUrl
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ]),
  );
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.enableCors({
    origin: parseCorsOrigins(process.env.FRONTEND_URL),
    methods: ['GET', 'POST', 'OPTIONS'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3001);
}

void bootstrap();

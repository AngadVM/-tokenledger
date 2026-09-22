import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  
  app.useGlobalPipes(new ValidationPipe({whitelist: true, transform: true}))
  const config = app.get(ConfigService);
  
  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port);
  console.log(`TokenLedger listening on http://localhost:${port}`);
}

void bootstrap();
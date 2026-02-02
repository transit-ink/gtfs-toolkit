/* eslint-disable-next-line sort-imports */
import './utils/sentry-instrument';

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { LoggerInterceptor } from './interceptors/logger.interceptor';

const BODY_LIMIT_50MB = 50 * 1024 * 1024;

async function bootstrap() {
  try {
    const adapter = new FastifyAdapter({ bodyLimit: BODY_LIMIT_50MB });
    const app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      adapter,
    );
    const configService = app.get(ConfigService);
    const appConfig = configService.get<AppConfig>('app');

    if (!appConfig) {
      throw new Error('Application configuration is not available');
    }

    // Configure Swagger
    const config = new DocumentBuilder()
      .setTitle('GTFS API')
      .setDescription('The GTFS API description')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    // Configure global validation pipe with class-transformer
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        enableDebugMessages: true,
        whitelist: true,
      }),
    );

    // Use global logger interceptor
    app.useGlobalInterceptors(new LoggerInterceptor());

    // Use global exception filter
    app.useGlobalFilters(new HttpExceptionFilter());

    // Enable CORS with specific origins for production
    const allowedOrigins =
      appConfig.nodeEnv === 'production'
        ? [/^https:\/\/(?:.+\.)?transit\.ink$/]
        : [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:5173',
          ];

    app.enableCors({
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    await app.listen(appConfig.port, '0.0.0.0');
    console.log(
      `Application is running on: http://localhost:${appConfig.port} in ${appConfig.nodeEnv} mode`,
    );
  } catch (error) {
    console.error('Failed to start application:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    process.exit(1);
  }
}

bootstrap();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { validateEnvironment } from './config/env.validation';

async function bootstrap() {
  const env = validateEnvironment();
  const isProduction = env.NODE_ENV === 'production';

  const app = await NestFactory.create(AppModule, {
    logger: isProduction ? ['error', 'warn', 'log'] : ['error', 'warn', 'log', 'debug'],
  });

  // Enable graceful shutdown hooks for SIGTERM / SIGINT in containerized environments
  app.enableShutdownHooks();

  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cookieParser());

  // Configure CORS for Cloudflare Pages, Workers, Tunnel, and Localhost
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, server-to-server, container health checks)
      if (!origin) return callback(null, true);

      const isAllowed =
        allowedOrigins.some((allowed) => {
          if (!isProduction && allowed === '*') return true;
          return origin === allowed || origin.startsWith(allowed);
        }) ||
        origin.endsWith('.pages.dev') ||
        origin.endsWith('.workers.dev');

      if (isAllowed) {
        return callback(null, true);
      }

      // In development mode only, permit localhost and 127.0.0.1
      if (!isProduction && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        return callback(null, true);
      }

      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.setGlobalPrefix('api');

  await app.listen(env.PORT, '0.0.0.0');
  console.log(`[CargoFlow API] Production ready listening on port ${env.PORT} (prefix: /api)`);
}

bootstrap();


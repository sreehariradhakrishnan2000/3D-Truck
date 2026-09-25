/**
 * Centralized Environment & Production Security Validator for CargoFlow API
 */
export interface ValidatedEnvironment {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  WEB_URL: string;
  CORS_ORIGIN: string;
  REDIS_URL?: string;
  COOKIE_DOMAIN?: string;
  COOKIE_SAMESITE: 'lax' | 'none' | 'strict';
}

export function validateEnvironment(): ValidatedEnvironment {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  const port = parseInt(process.env.PORT || '3001', 10);

  // 1. DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('CRITICAL CONFIGURATION ERROR: DATABASE_URL is required.');
  }
  if (isProduction) {
    if (
      databaseUrl.includes('localhost') ||
      databaseUrl.includes('127.0.0.1') ||
      databaseUrl.includes('0.0.0.0')
    ) {
      throw new Error(
        'CRITICAL PRODUCTION ERROR: DATABASE_URL cannot reference localhost in production. Neon PostgreSQL with sslmode=require is required.'
      );
    }
    if (!databaseUrl.includes('sslmode=require')) {
      throw new Error(
        'CRITICAL PRODUCTION ERROR: DATABASE_URL must require SSL (sslmode=require) in production.'
      );
    }
  }

  // 2. JWT_SECRET
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('CRITICAL CONFIGURATION ERROR: JWT_SECRET is required.');
  }
  if (isProduction && (jwtSecret.length < 32 || jwtSecret.includes('dev-secret'))) {
    throw new Error(
      'CRITICAL PRODUCTION ERROR: JWT_SECRET must be at least 32 characters and cannot be a development secret in production.'
    );
  }

  // 3. WEB_URL
  let webUrl = process.env.WEB_URL;
  if (isProduction) {
    if (!webUrl) {
      webUrl = 'https://cargoflow.com';
    } else {
      if (webUrl.includes('localhost') || webUrl.includes('127.0.0.1')) {
        throw new Error(
          `CRITICAL PRODUCTION ERROR: WEB_URL cannot reference localhost in production. Found: ${webUrl}`
        );
      }
      if (!webUrl.startsWith('https://')) {
        throw new Error(
          `CRITICAL PRODUCTION ERROR: WEB_URL must use https:// in production. Found: ${webUrl}`
        );
      }
    }
  } else {
    webUrl = webUrl || 'http://localhost:3000';
  }

  // 4. CORS_ORIGIN
  let corsOrigin = process.env.CORS_ORIGIN;
  if (isProduction) {
    if (!corsOrigin) {
      corsOrigin = webUrl;
    } else {
      if (corsOrigin.includes('localhost') || corsOrigin.includes('127.0.0.1')) {
        throw new Error(
          `CRITICAL PRODUCTION ERROR: CORS_ORIGIN cannot reference localhost in production. Found: ${corsOrigin}`
        );
      }
      if (corsOrigin.includes('*')) {
        throw new Error(
          'CRITICAL PRODUCTION ERROR: CORS_ORIGIN wildcard (*) is forbidden in production.'
        );
      }
    }
  } else {
    corsOrigin = corsOrigin || webUrl || 'http://localhost:3000';
  }

  // 5. REDIS_URL
  const redisUrl = process.env.REDIS_URL;
  if (isProduction && redisUrl) {
    if (redisUrl.includes('localhost') || redisUrl.includes('127.0.0.1')) {
      throw new Error(
        `CRITICAL PRODUCTION ERROR: REDIS_URL cannot point to localhost in production. Found: ${redisUrl}`
      );
    }
  }

  // 6. COOKIE
  const cookieDomain = process.env.COOKIE_DOMAIN || undefined;
  if (isProduction && cookieDomain && (cookieDomain.includes('localhost') || cookieDomain.includes('127.0.0.1'))) {
    throw new Error(
      `CRITICAL PRODUCTION ERROR: COOKIE_DOMAIN cannot reference localhost in production. Found: ${cookieDomain}`
    );
  }

  const cookieSameSite = (process.env.COOKIE_SAMESITE as 'lax' | 'none' | 'strict') || 'lax';

  return {
    NODE_ENV: nodeEnv,
    PORT: port,
    DATABASE_URL: databaseUrl,
    JWT_SECRET: jwtSecret,
    WEB_URL: webUrl,
    CORS_ORIGIN: corsOrigin,
    REDIS_URL: redisUrl,
    COOKIE_DOMAIN: cookieDomain,
    COOKIE_SAMESITE: cookieSameSite,
  };
}


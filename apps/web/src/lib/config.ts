/**
 * Centralized Environment Configuration & Security Validator for CargoFlow Web Frontend
 *
 * Guarantees zero silent fallbacks to localhost in production mode.
 */

function validateAndGetApiUrl(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const url = process.env.NEXT_PUBLIC_API_URL;

  if (isProduction) {
    if (!url) {
      throw new Error(
        'CRITICAL CONFIGURATION ERROR: NEXT_PUBLIC_API_URL is missing in production.'
      );
    }
    if (!url.startsWith('https://')) {
      throw new Error(
        `CRITICAL SECURITY ERROR: NEXT_PUBLIC_API_URL must use https:// in production. Found: ${url}`
      );
    }
    if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('0.0.0.0')) {
      throw new Error(
        `CRITICAL SECURITY ERROR: NEXT_PUBLIC_API_URL cannot reference localhost in production. Found: ${url}`
      );
    }
    return url;
  }

  // Development mode fallback
  return url || 'http://localhost:3001/api';
}

function validateAndGetWsUrl(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const url = process.env.NEXT_PUBLIC_WS_URL;

  if (isProduction) {
    if (!url) {
      throw new Error(
        'CRITICAL CONFIGURATION ERROR: NEXT_PUBLIC_WS_URL is missing in production.'
      );
    }
    if (!url.startsWith('https://') && !url.startsWith('wss://')) {
      throw new Error(
        `CRITICAL SECURITY ERROR: NEXT_PUBLIC_WS_URL must use https:// or wss:// in production. Found: ${url}`
      );
    }
    if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('0.0.0.0')) {
      throw new Error(
        `CRITICAL SECURITY ERROR: NEXT_PUBLIC_WS_URL cannot reference localhost in production. Found: ${url}`
      );
    }
    return url;
  }

  // Development mode fallback
  return url || 'http://localhost:3001';
}

export const envConfig = {
  get apiUrl(): string {
    return validateAndGetApiUrl();
  },
  get wsUrl(): string {
    return validateAndGetWsUrl();
  },
  isProduction: process.env.NODE_ENV === 'production',
};


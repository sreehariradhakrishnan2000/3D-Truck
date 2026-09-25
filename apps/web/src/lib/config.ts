/**
 * Centralized Environment Configuration & Security Validator for CargoFlow Web Frontend
 *
 * Guarantees zero silent fallbacks to localhost in production mode,
 * while allowing seamless local development and preview testing.
 */

const DEFAULT_PROD_API_URL = 'https://api.cargoflow.com/api';
const DEFAULT_PROD_WS_URL = 'https://api.cargoflow.com';
const DEFAULT_DEV_API_URL = 'http://localhost:3001/api';
const DEFAULT_DEV_WS_URL = 'http://localhost:3001';

function isBrowserLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
}

function validateAndGetApiUrl(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const isLocal = isBrowserLocalhost();

  let url = process.env.NEXT_PUBLIC_API_URL;

  if (!url) {
    url = isLocal ? DEFAULT_DEV_API_URL : (isProduction ? DEFAULT_PROD_API_URL : DEFAULT_DEV_API_URL);
  }

  // If in real production (not local developer testing)
  if (isProduction && !isLocal) {
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
  }

  return url;
}

function validateAndGetWsUrl(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const isLocal = isBrowserLocalhost();

  let url = process.env.NEXT_PUBLIC_WS_URL;

  if (!url) {
    url = isLocal ? DEFAULT_DEV_WS_URL : (isProduction ? DEFAULT_PROD_WS_URL : DEFAULT_DEV_WS_URL);
  }

  // If in real production (not local developer testing)
  if (isProduction && !isLocal) {
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
  }

  return url;
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

/**
 * Centralized Environment Configuration & Production Security Validator for CargoFlow Web Frontend
 *
 * Guarantees zero silent fallbacks to localhost or placeholder parked domains in production mode.
 * Supports Single Public workers.dev Gateway with same-origin relative API routing (/api).
 */

const DEFAULT_DEV_API_URL = 'http://localhost:3001/api';
const DEFAULT_DEV_WS_URL = 'http://localhost:3001';

const DISALLOWED_PRODUCTION_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', 'cargoflow.com', 'yourdomain.com', 'example.com'];

export function isBrowserLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
}

/**
 * Validates production endpoint URLs according to strict security rules.
 * Supports both same-origin relative paths (/api) and valid external HTTPS endpoints.
 */
export function validateProductionEndpoints(
  apiUrl?: string,
  wsUrl?: string
): { apiUrl: string; wsUrl: string } {
  if (!apiUrl || !apiUrl.trim()) {
    throw new Error(
      'CRITICAL CONFIGURATION ERROR: NEXT_PUBLIC_API_URL is required in production. Use relative path "/api" for same-origin proxy or a secure external https:// URL.'
    );
  }

  const cleanApi = apiUrl.trim().replace(/\/+$/, '');

  // 1. Same-origin relative path (Single Public workers.dev Gateway)
  if (cleanApi === '/api' || cleanApi.startsWith('/api/')) {
    let cleanWs = wsUrl?.trim()?.replace(/\/+$/, '') || '';
    if (cleanWs && !cleanWs.startsWith('/') && !cleanWs.startsWith('wss://') && !cleanWs.startsWith('https://')) {
      throw new Error(
        `CRITICAL SECURITY ERROR: NEXT_PUBLIC_WS_URL must use https:// or wss:// or relative path in production. Found: ${cleanWs}`
      );
    }
    return { apiUrl: cleanApi, wsUrl: cleanWs };
  }

  // 2. Absolute URL validation
  if (!cleanApi.startsWith('https://')) {
    throw new Error(
      `CRITICAL SECURITY ERROR: NEXT_PUBLIC_API_URL must use https:// in production. Found: ${cleanApi}`
    );
  }

  for (const disallowed of DISALLOWED_PRODUCTION_HOSTS) {
    if (cleanApi.toLowerCase().includes(disallowed)) {
      throw new Error(
        `CRITICAL CONFIGURATION ERROR: NEXT_PUBLIC_API_URL cannot reference '${disallowed}' in production. Found: ${cleanApi}`
      );
    }
  }

  // Determine WS URL: derive from API URL if not explicitly provided
  let cleanWs = wsUrl?.trim()?.replace(/\/+$/, '');
  if (!cleanWs) {
    cleanWs = cleanApi.replace(/^https:\/\//, 'wss://').replace(/\/api$/, '');
  }

  if (!cleanWs.startsWith('https://') && !cleanWs.startsWith('wss://')) {
    throw new Error(
      `CRITICAL SECURITY ERROR: NEXT_PUBLIC_WS_URL must use https:// or wss:// in production. Found: ${cleanWs}`
    );
  }

  for (const disallowed of DISALLOWED_PRODUCTION_HOSTS) {
    if (cleanWs.toLowerCase().includes(disallowed)) {
      throw new Error(
        `CRITICAL CONFIGURATION ERROR: NEXT_PUBLIC_WS_URL cannot reference '${disallowed}' in production. Found: ${cleanWs}`
      );
    }
  }

  return { apiUrl: cleanApi, wsUrl: cleanWs };
}

function resolveApiUrl(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const isLocal = isBrowserLocalhost();
  // In production, default to same-origin /api path
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || (isProduction && !isLocal ? '/api' : '');

  if (isProduction && !isLocal) {
    const validated = validateProductionEndpoints(rawUrl, process.env.NEXT_PUBLIC_WS_URL);
    return validated.apiUrl;
  }

  return (rawUrl || DEFAULT_DEV_API_URL).trim().replace(/\/+$/, '');
}

function resolveWsUrl(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const isLocal = isBrowserLocalhost();
  const rawUrl = process.env.NEXT_PUBLIC_WS_URL;

  // In production browser, automatically use same-origin WebSocket
  if (typeof window !== 'undefined' && !isLocal) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }

  if (isProduction && !isLocal && rawUrl) {
    const validated = validateProductionEndpoints('/api', rawUrl);
    return validated.wsUrl;
  }

  return (rawUrl || DEFAULT_DEV_WS_URL).trim().replace(/\/+$/, '');
}

export const envConfig = {
  get apiUrl(): string {
    return resolveApiUrl();
  },
  get wsUrl(): string {
    return resolveWsUrl();
  },
  isProduction: process.env.NODE_ENV === 'production',
};

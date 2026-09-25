/**
 * Centralized Environment Configuration & Security Validator for CargoFlow Web Frontend
 *
 * Supports environment variables, local preview, and runtime endpoint configuration.
 */

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

  // 1. Runtime override via localStorage (allows connecting Cloudflare Worker to Cloudflare Tunnel)
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('cf_api_url');
    if (saved) return saved.replace(/\/+$/, '');
  }

  // 2. Build-time or deployment environment variable
  let url = process.env.NEXT_PUBLIC_API_URL;

  if (!url) {
    url = isLocal ? DEFAULT_DEV_API_URL : '';
  }

  // 3. Security check: in real production, reject plaintext HTTP and localhost
  if (isProduction && !isLocal && url) {
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

  return url ? url.replace(/\/+$/, '') : '';
}

function validateAndGetWsUrl(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const isLocal = isBrowserLocalhost();

  // 1. Runtime override via localStorage
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('cf_ws_url');
    if (saved) return saved.replace(/\/+$/, '');
  }

  // 2. Build-time or deployment environment variable
  let url = process.env.NEXT_PUBLIC_WS_URL;

  if (!url) {
    url = isLocal ? DEFAULT_DEV_WS_URL : '';
  }

  // 3. Security check: in real production, reject unencrypted WS and localhost
  if (isProduction && !isLocal && url) {
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

  return url ? url.replace(/\/+$/, '') : '';
}

export const envConfig = {
  get apiUrl(): string {
    return validateAndGetApiUrl();
  },
  get wsUrl(): string {
    return validateAndGetWsUrl();
  },
  setApiUrl(url: string) {
    if (typeof window !== 'undefined') {
      if (url) {
        localStorage.setItem('cf_api_url', url.trim().replace(/\/+$/, ''));
      } else {
        localStorage.removeItem('cf_api_url');
      }
    }
  },
  setWsUrl(url: string) {
    if (typeof window !== 'undefined') {
      if (url) {
        localStorage.setItem('cf_ws_url', url.trim().replace(/\/+$/, ''));
      } else {
        localStorage.removeItem('cf_ws_url');
      }
    }
  },
  isProduction: process.env.NODE_ENV === 'production',
};

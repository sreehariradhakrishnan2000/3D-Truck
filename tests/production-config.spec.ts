import { describe, it, expect } from 'vitest';
import { validateProductionEndpoints } from '../apps/web/src/lib/config';

describe('Production URL Configuration & Security Validator', () => {
  it('1. Rejects missing or empty NEXT_PUBLIC_API_URL in production', () => {
    expect(() => validateProductionEndpoints('', '')).toThrowError(/NEXT_PUBLIC_API_URL is required in production/);
    expect(() => validateProductionEndpoints(undefined, undefined)).toThrowError(/NEXT_PUBLIC_API_URL is required in production/);
  });

  it('2. Rejects unencrypted HTTP in production for NEXT_PUBLIC_API_URL', () => {
    expect(() => validateProductionEndpoints('http://api.production.com/api')).toThrowError(
      /NEXT_PUBLIC_API_URL must use https:\/\/ in production/
    );
  });

  it('3. Rejects localhost and 127.0.0.1 in production for NEXT_PUBLIC_API_URL', () => {
    expect(() => validateProductionEndpoints('https://localhost:3001/api')).toThrowError(
      /cannot reference 'localhost' in production/
    );
    expect(() => validateProductionEndpoints('https://127.0.0.1:3001/api')).toThrowError(
      /cannot reference '127.0.0.1' in production/
    );
    expect(() => validateProductionEndpoints('https://0.0.0.0:3001/api')).toThrowError(
      /cannot reference '0.0.0.0' in production/
    );
  });

  it('4. Rejects parked or placeholder domains in production for NEXT_PUBLIC_API_URL', () => {
    expect(() => validateProductionEndpoints('https://api.cargoflow.com/api')).toThrowError(
      /cannot reference 'cargoflow.com' in production/
    );
    expect(() => validateProductionEndpoints('https://api.yourdomain.com/api')).toThrowError(
      /cannot reference 'yourdomain.com' in production/
    );
    expect(() => validateProductionEndpoints('https://api.example.com/api')).toThrowError(
      /cannot reference 'example.com' in production/
    );
  });

  it('5. Successfully validates a valid HTTPS production API URL and derives secure WebSocket URL', () => {
    const result = validateProductionEndpoints('https://api.my-real-freight.com/api');
    expect(result.apiUrl).toBe('https://api.my-real-freight.com/api');
    expect(result.wsUrl).toBe('wss://api.my-real-freight.com');
  });

  it('6. Successfully accepts an explicitly provided secure WebSocket URL', () => {
    const result = validateProductionEndpoints(
      'https://api.my-real-freight.com/api',
      'wss://ws.my-real-freight.com'
    );
    expect(result.apiUrl).toBe('https://api.my-real-freight.com/api');
    expect(result.wsUrl).toBe('wss://ws.my-real-freight.com');
  });

  it('7. Rejects placeholder domains and unencrypted WS for NEXT_PUBLIC_WS_URL', () => {
    expect(() =>
      validateProductionEndpoints('https://api.my-real-freight.com/api', 'ws://api.my-real-freight.com')
    ).toThrowError(/NEXT_PUBLIC_WS_URL must use https:\/\/ or wss:\/\//);

    expect(() =>
      validateProductionEndpoints('https://api.my-real-freight.com/api', 'wss://api.cargoflow.com')
    ).toThrowError(/NEXT_PUBLIC_WS_URL cannot reference 'cargoflow.com'/);

    expect(() =>
      validateProductionEndpoints('https://api.my-real-freight.com/api', 'wss://localhost:3001')
    ).toThrowError(/NEXT_PUBLIC_WS_URL cannot reference 'localhost'/);
  });

  it('8. Accepts same-origin relative path /api in production', () => {
    const result = validateProductionEndpoints('/api');
    expect(result.apiUrl).toBe('/api');
  });

  it('9. Accepts same-origin relative path /api with relative wsUrl', () => {
    const result = validateProductionEndpoints('/api', '/ws');
    expect(result.apiUrl).toBe('/api');
    expect(result.wsUrl).toBe('/ws');
  });
});


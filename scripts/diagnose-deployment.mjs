#!/usr/bin/env node

/**
 * CargoFlow Deployment Diagnostic Tool
 * 
 * Verifies live Cloudflare deployment health, MIME type handling,
 * API health/readiness, CORS preflights, and WebSocket connectivity.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
function getArg(flag) {
  const index = args.indexOf(flag);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return null;
}

// 1. Determine targets
const DEFAULT_FRONTEND = 'https://3d-truck.sreehariradhakrishnan2000.workers.dev';
const frontendUrl = getArg('--frontend') || process.env.FRONTEND_URL || DEFAULT_FRONTEND;

let apiUrl = getArg('--api') || process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
let wsUrl = getArg('--ws') || process.env.WS_URL || process.env.NEXT_PUBLIC_WS_URL;

// If API not specified, try reading apps/web/.env.tunnel.local
if (!apiUrl) {
  const tunnelEnvPath = path.join(rootDir, 'apps', 'web', '.env.tunnel.local');
  if (fs.existsSync(tunnelEnvPath)) {
    const content = fs.readFileSync(tunnelEnvPath, 'utf-8');
    const apiMatch = content.match(/NEXT_PUBLIC_API_URL=(.+)/);
    const wsMatch = content.match(/NEXT_PUBLIC_WS_URL=(.+)/);
    if (apiMatch) apiUrl = apiMatch[1].trim();
    if (wsMatch) wsUrl = wsMatch[1].trim();
  }
}

console.log('='.repeat(70));
console.log('🩺 CargoFlow — Live Deployment Diagnostic Suite');
console.log('='.repeat(70));
console.log(`Frontend URL: ${frontendUrl}`);
console.log(`API URL:      ${apiUrl || '(Not specified - skipping backend tests)'}`);
console.log(`WS URL:       ${wsUrl || '(Derived/Not specified)'}`);
console.log('='.repeat(70) + '\n');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

async function runCheck(name, testFn) {
  totalChecks++;
  process.stdout.write(`Testing: ${name}... `);
  try {
    const result = await testFn();
    passedChecks++;
    console.log(`✅ PASSED${result ? ' (' + result + ')' : ''}`);
    return true;
  } catch (err) {
    failedChecks++;
    console.log(`❌ FAILED`);
    console.error(`   Error: ${err.message}\n`);
    return false;
  }
}

async function run() {
  // Test 1: Frontend root document
  await runCheck('Frontend Root HTML Delivery', async () => {
    const res = await fetch(frontendUrl, { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP status ${res.status} ${res.statusText}`);
    const ctype = res.headers.get('content-type') || '';
    if (!ctype.includes('text/html')) {
      throw new Error(`Expected text/html, got: ${ctype}`);
    }
    const cacheControl = res.headers.get('cache-control') || '';
    return `Status: ${res.status}, Cache-Control: ${cacheControl || 'none'}`;
  });

  // Test 2: HTML Caching Header Safety
  await runCheck('HTML Cache-Control Disables Stale Bundles', async () => {
    const res = await fetch(frontendUrl, { method: 'GET' });
    const cacheControl = res.headers.get('cache-control') || '';
    if (!cacheControl.includes('no-cache') && !cacheControl.includes('no-store')) {
      throw new Error(`HTML response does not include no-cache or no-store: ${cacheControl}`);
    }
    return cacheControl;
  });

  // Test 3: Static Asset MIME-type Safeguard (Edge Middleware)
  await runCheck('Missing JS Chunk Returns text/plain 404 (Not HTML)', async () => {
    const missingChunkUrl = `${frontendUrl.replace(/\/+$/, '')}/_next/static/chunks/diag-test-${Date.now()}.js`;
    const res = await fetch(missingChunkUrl, { method: 'GET' });
    if (res.status !== 404) {
      throw new Error(`Expected 404 for missing chunk, got: ${res.status}`);
    }
    const ctype = res.headers.get('content-type') || '';
    if (ctype.includes('text/html')) {
      throw new Error(`Edge returned HTML for missing JS chunk! This causes MIME-type errors in browsers: ${ctype}`);
    }
    return `Status: 404, Content-Type: ${ctype}`;
  });

  // If API URL provided, run API and WebSocket checks
  if (apiUrl) {
    const cleanApi = apiUrl.replace(/\/+$/, '');
    const apiBase = cleanApi.replace(/\/api$/, '');

    // Test 4: API Health
    await runCheck('API Health Endpoint (/health or /api/health)', async () => {
      const healthUrl = cleanApi.endsWith('/api') ? `${cleanApi}/health` : `${cleanApi}/api/health`;
      const res = await fetch(healthUrl, { method: 'GET' });
      if (!res.ok) throw new Error(`HTTP status ${res.status}`);
      const data = await res.json();
      return JSON.stringify(data);
    });

    // Test 5: API Readiness / Database Connection
    await runCheck('API Readiness Endpoint (/ready or /api/ready)', async () => {
      const readyUrl = cleanApi.endsWith('/api') ? `${cleanApi}/ready` : `${cleanApi}/api/ready`;
      const res = await fetch(readyUrl, { method: 'GET' });
      if (!res.ok) throw new Error(`HTTP status ${res.status}`);
      const data = await res.json();
      return JSON.stringify(data);
    });

    // Test 6: CORS Preflight for Auth Login
    await runCheck('CORS Preflight Check (OPTIONS /api/auth/login)', async () => {
      const loginUrl = cleanApi.endsWith('/api') ? `${cleanApi}/auth/login` : `${cleanApi}/api/auth/login`;
      const res = await fetch(loginUrl, {
        method: 'OPTIONS',
        headers: {
          'Origin': frontendUrl,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization',
        },
      });

      if (res.status >= 300 && res.status < 400) {
        throw new Error(`Redirect detected during CORS preflight! (HTTP ${res.status})`);
      }

      const allowOrigin = res.headers.get('access-control-allow-origin');
      const allowMethods = res.headers.get('access-control-allow-methods');

      if (!allowOrigin) {
        throw new Error(`Missing 'Access-Control-Allow-Origin' header in preflight response`);
      }
      return `Origin: ${allowOrigin}, Methods: ${allowMethods || '*'}`;
    });

    // Test 7: WebSocket / Socket.IO Polling Handshake
    await runCheck('Socket.IO Polling Handshake', async () => {
      const socketUrl = `${apiBase}/socket.io/?EIO=4&transport=polling`;
      const res = await fetch(socketUrl, { method: 'GET' });
      if (!res.ok) throw new Error(`HTTP status ${res.status}`);
      const body = await res.text();
      if (!body.startsWith('0{')) {
        throw new Error(`Unexpected Socket.IO response: ${body.slice(0, 50)}`);
      }
      return `Handshake OK (${body.slice(0, 20)}...)`;
    });
  }

  console.log('\n' + '='.repeat(70));
  console.log(`DIAGNOSTIC SUMMARY: ${passedChecks}/${totalChecks} checks passed.`);
  console.log('='.repeat(70));

  if (failedChecks > 0) {
    console.error(`\n❌ Deployment diagnosis completed with ${failedChecks} failure(s).\n`);
    process.exit(1);
  } else {
    console.log(`\n🎉 All checked endpoints are healthy and compliant with production rules.\n`);
    process.exit(0);
  }
}

run().catch((err) => {
  console.error(`Fatal diagnostic error: ${err.message}`);
  process.exit(1);
});

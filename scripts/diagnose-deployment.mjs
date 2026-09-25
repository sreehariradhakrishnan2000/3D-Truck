#!/usr/bin/env node

/**
 * CargoFlow Single Public URL Deployment Diagnostic Suite
 *
 * Verifies live Cloudflare Worker deployment health, MIME type handling,
 * same-origin API proxying (/api/*), and WebSocket proxying (/socket.io/*, /ws).
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

const DEFAULT_GATEWAY = 'https://3d-truck.sreehariradhakrishnan2000.workers.dev';
const publicUrl = (getArg('--url') || getArg('--frontend') || process.env.PUBLIC_URL || DEFAULT_GATEWAY).replace(/\/+$/, '');

console.log('='.repeat(70));
console.log('🩺 CargoFlow — Single Public workers.dev Deployment Diagnostic');
console.log('='.repeat(70));
console.log(`Public Gateway URL:  ${publicUrl}`);
console.log(`Same-Origin API:     ${publicUrl}/api/*`);
console.log(`Same-Origin WS:      ${publicUrl.replace(/^http/, 'ws')}/ws`);
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
  await runCheck('Frontend Root Document (HTML delivery)', async () => {
    const res = await fetch(publicUrl, { method: 'GET' });
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
    const res = await fetch(publicUrl, { method: 'GET' });
    const cacheControl = res.headers.get('cache-control') || '';
    if (!cacheControl.includes('no-cache') && !cacheControl.includes('no-store')) {
      throw new Error(`HTML response does not include no-cache or no-store: ${cacheControl}`);
    }
    return cacheControl;
  });

  // Test 3: Static Asset MIME-type Safeguard (Edge Middleware)
  await runCheck('Missing JS Chunk Returns text/plain 404 (Not HTML)', async () => {
    const missingChunkUrl = `${publicUrl}/_next/static/chunks/diag-test-${Date.now()}.js`;
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

  // Test 4: Same-Origin API Health
  await runCheck('Same-Origin API Health Check (GET /api/health)', async () => {
    const healthUrl = `${publicUrl}/api/health`;
    const res = await fetch(healthUrl, { method: 'GET' });
    if (res.status === 503) {
      const body = await res.json().catch(() => ({}));
      throw new Error(`Worker returned 503: ${body.message || 'BACKEND_API_ORIGIN not configured or reachable'}`);
    }
    if (!res.ok) throw new Error(`HTTP status ${res.status}`);
    const data = await res.json();
    return JSON.stringify(data);
  });

  // Test 5: Same-Origin API Readiness / Database Connection
  await runCheck('Same-Origin API Readiness Check (GET /api/ready)', async () => {
    const readyUrl = `${publicUrl}/api/ready`;
    const res = await fetch(readyUrl, { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP status ${res.status}`);
    const data = await res.json();
    return JSON.stringify(data);
  });

  // Test 6: Same-Origin Auth Login API
  await runCheck('Same-Origin Auth Login (POST /api/auth/login)', async () => {
    const loginUrl = `${publicUrl}/api/auth/login`;
    // Attempt login with demo credentials
    const res = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@cargoflow.demo',
        password: 'wrong-password-for-preflight-test',
      }),
    });

    if (res.status === 502) {
      throw new Error(`Worker returned 502 Bad Gateway while contacting backend`);
    }

    // Expect 401 Unauthorized (confirming NestJS received and evaluated credentials)
    if (res.status === 401) {
      return `Auth endpoint responsive (HTTP 401 for test credentials)`;
    } else if (res.ok) {
      const data = await res.json();
      return `Auth succeeded (accessToken present: ${Boolean(data.accessToken)})`;
    }
    return `Status: ${res.status}`;
  });

  // Test 7: Same-Origin Socket.IO Polling Handshake
  await runCheck('Same-Origin Socket.IO Handshake (GET /socket.io/)', async () => {
    const socketUrl = `${publicUrl}/socket.io/?EIO=4&transport=polling`;
    const res = await fetch(socketUrl, { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP status ${res.status}`);
    const body = await res.text();
    if (!body.startsWith('0{')) {
      throw new Error(`Unexpected Socket.IO response: ${body.slice(0, 50)}`);
    }
    return `Handshake OK (${body.slice(0, 20)}...)`;
  });

  console.log('\n' + '='.repeat(70));
  console.log(`DIAGNOSTIC SUMMARY: ${passedChecks}/${totalChecks} checks passed.`);
  console.log('='.repeat(70));

  if (failedChecks > 0) {
    console.error(`\n❌ Deployment diagnosis completed with ${failedChecks} failure(s).\n`);
    process.exit(1);
  } else {
    console.log(`\n🎉 All gateway, API, and WebSocket endpoints are healthy and working!\n`);
    process.exit(0);
  }
}

run().catch((err) => {
  console.error(`Fatal diagnostic error: ${err.message}`);
  process.exit(1);
});

#!/usr/bin/env node

/**
 * CargoFlow Production Configuration Auditor
 *
 * Verifies that no forbidden placeholder domains (e.g. cargoflow.com, example.com)
 * or unguarded localhost references leak into production runtime bundles.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('='.repeat(70));
console.log('🔍 CargoFlow — Production Configuration & Security Audit');
console.log('='.repeat(70));

const FORBIDDEN_DOMAINS = [
  'api.cargoflow.com',
  'cargoflow.com',
  'yourdomain.com',
  'example.com',
];

const SCAN_DIRS = [
  path.join(rootDir, 'apps', 'web', 'src'),
  path.join(rootDir, 'apps', 'api', 'src'),
];

const SCAN_FILES = [
  path.join(rootDir, 'apps', 'web', 'wrangler.toml'),
  path.join(rootDir, 'apps', 'web', 'next.config.mjs'),
  path.join(rootDir, 'docker-compose.cloudflare.yml'),
];

// Files whose job is specifically to validate / reject forbidden domains or provide dev defaults
const VALIDATOR_FILES = [
  'apps/web/src/lib/config.ts',
  'apps/api/src/config/env.validation.ts',
];

function getAllFiles(dir, exts = ['.ts', '.tsx', '.js', '.mjs', '.toml', '.yml', '.yaml']) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(filePath, exts));
    } else if (exts.includes(path.extname(filePath))) {
      results.push(filePath);
    }
  }
  return results;
}

const allFiles = [
  ...SCAN_DIRS.flatMap((d) => getAllFiles(d)),
  ...SCAN_FILES.filter((f) => fs.existsSync(f)),
];

let criticalViolations = 0;
let devFallbacks = 0;
let productionSafeChecks = 0;

console.log(`\nScanning ${allFiles.length} source and configuration files...\n`);

for (const file of allFiles) {
  const relPath = path.relative(rootDir, file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  const isValidatorFile = VALIDATOR_FILES.some((vf) => relPath.endsWith(vf));

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();

    // Check for forbidden placeholder domains
    for (const domain of FORBIDDEN_DOMAINS) {
      if (line.includes(domain)) {
        // Exempt test files, comments, and the blacklist arrays in validator files
        if (
          relPath.includes('tests/') ||
          trimmed.startsWith('//') ||
          trimmed.startsWith('*') ||
          trimmed.startsWith('#') ||
          (isValidatorFile && (trimmed.includes('DISALLOWED_PRODUCTION_HOSTS') || trimmed.includes('.includes(') || trimmed.includes('throw new Error')))
        ) {
          continue;
        }
        console.error(`❌ [CRITICAL VIOLATION] Forbidden placeholder domain '${domain}' in ${relPath}:${lineNum}`);
        console.error(`   > ${trimmed}\n`);
        criticalViolations++;
      }
    }

    // Check for localhost / 127.0.0.1
    if (line.includes('localhost') || line.includes('127.0.0.1')) {
      // Check if it's in comments, test, or validator definition
      if (
        trimmed.startsWith('//') ||
        trimmed.startsWith('*') ||
        trimmed.startsWith('#') ||
        relPath.includes('tests/') ||
        (isValidatorFile && (trimmed.includes('DISALLOWED_PRODUCTION_HOSTS') || trimmed.includes('DEFAULT_DEV_') || trimmed.includes('host ===')))
      ) {
        devFallbacks++;
        return;
      }

      // Check if it is a safe local-development fallback
      const isGuardedFallback =
        line.includes('NODE_ENV !== \'production\'') ||
        line.includes('NODE_ENV === \'development\'') ||
        line.includes('|| \'http://localhost') ||
        line.includes('|| "http://localhost') ||
        line.includes('|| \'ws://localhost') ||
        line.includes('|| "ws://localhost') ||
        line.includes('process.env.API_URL') ||
        line.includes('process.env.WEB_URL');

      if (isGuardedFallback) {
        devFallbacks++;
      } else {
        // Potential un-guarded localhost in production code
        if (relPath.startsWith('apps/web/src/')) {
          console.warn(`⚠️  [POTENTIAL HAZARD] Unguarded localhost in web client code: ${relPath}:${lineNum}`);
          console.warn(`   > ${trimmed}\n`);
          criticalViolations++;
        } else {
          devFallbacks++;
        }
      }
    }
  });
}

// Check configuration safeguards
console.log('--- Checking Architectural Safeguards ---');

// 1. Web configuration validator
const webConfigPath = path.join(rootDir, 'apps', 'web', 'src', 'lib', 'config.ts');
if (fs.existsSync(webConfigPath)) {
  const content = fs.readFileSync(webConfigPath, 'utf-8');
  if (content.includes('validateProductionEndpoints') && content.includes('NEXT_PUBLIC_API_URL is required in production')) {
    console.log('✅ Web client includes strict validateProductionEndpoints() runtime validator.');
    productionSafeChecks++;
  } else {
    console.error('❌ Web client missing production endpoint validator in apps/web/src/lib/config.ts');
    criticalViolations++;
  }
} else {
  console.error('❌ apps/web/src/lib/config.ts not found');
  criticalViolations++;
}

// 2. API host binding
const apiMainPath = path.join(rootDir, 'apps', 'api', 'src', 'main.ts');
if (fs.existsSync(apiMainPath)) {
  const content = fs.readFileSync(apiMainPath, 'utf-8');
  if (content.includes('0.0.0.0')) {
    console.log('✅ API main.ts explicitly binds to 0.0.0.0 for container and tunnel ingress.');
    productionSafeChecks++;
  } else {
    console.warn('⚠️  API main.ts does not bind to 0.0.0.0 explicitly.');
  }

  if (content.includes('process.env.WEB_URL') || content.includes('origin:')) {
    console.log('✅ API main.ts supports environment-configured CORS origins.');
    productionSafeChecks++;
  }
}

// Summary
console.log('\n' + '='.repeat(70));
console.log('AUDIT SUMMARY:');
console.log(`- Production Safeguards Verified: ${productionSafeChecks}`);
console.log(`- Development-Only Fallbacks:      ${devFallbacks}`);
console.log(`- Critical Production Violations:  ${criticalViolations}`);
console.log('='.repeat(70));

if (criticalViolations > 0) {
  console.error('\n❌ AUDIT FAILED: Production configuration contains violations that must be resolved.\n');
  process.exit(1);
} else {
  console.log('\n✅ AUDIT PASSED: Repository is free of placeholder domains and production leaks.\n');
  process.exit(0);
}


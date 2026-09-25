# CargoFlow — Cloudflare Production & Free Preview Deployment Guide

This guide details the step-by-step instructions for deploying and running **CargoFlow** using **Cloudflare Workers (OpenNext)**, **Neon PostgreSQL**, **BullMQ/Redis**, and **Cloudflare Tunnels**.

---

## 🏗️ Architecture Overview

| Component | Technology | Hosting / Runtime | Connectivity |
|---|---|---|---|
| **Frontend** | Next.js 14 App Router (R3F 3D Engine) | **Cloudflare Workers** via `@opennextjs/cloudflare` | Public edge (`https://3d-truck.sreehariradhakrishnan2000.workers.dev`) |
| **API** | NestJS 10 + Socket.IO | Node.js container / server | Exposed via Cloudflare Tunnel |
| **Database** | PostgreSQL 16 | **Neon Serverless PostgreSQL** | Direct pooled connection with SSL (`sslmode=require`) |
| **Worker** | BullMQ | Node.js container | Redis queue connection |
| **Queue/Cache** | Redis 7 | Upstash Serverless or local Redis container | Internal TCP connection |

---

## 🚀 Free Tier Deployment & Preview Workflow

If you are developing or testing CargoFlow without purchasing a custom domain:

### 1. Database (Neon Serverless PostgreSQL)
Neon provides a free serverless tier:
1. Go to [Neon Console](https://console.neon.tech/) and create a project (`neondb`).
2. Copy the pooled connection string with SSL:
   ```env
   DATABASE_URL="postgresql://neondb_owner:PASSWORD@ep-solitary-frost-a50e9766-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ```
3. Run migrations:
   ```bash
   npm run db:migrate:prod
   ```

### 2. Expose Local/Container API via Cloudflare Quick Tunnel
> [!WARNING]
> **Cloudflare Quick Tunnels (`*.trycloudflare.com`) are temporary and intended for testing and preview only.**
> They do not require a domain or a Cloudflare login, but generate a new random URL upon each launch. They must not be relied upon as permanent production infrastructure.

Start the API and launch the automated Quick Tunnel:

```bash
# Terminal 1: Start NestJS API
npm run dev:api

# Terminal 2: Launch Quick Tunnel
npm run tunnel:api
```

What `npm run tunnel:api` does automatically:
1. Verifies that the local API is responding on port 3001.
2. Spawns Cloudflare Quick Tunnel (`npx wrangler tunnel quick-start http://localhost:3001`).
3. Captures the generated `https://<random-id>.trycloudflare.com` URL.
4. Generates `apps/web/.env.tunnel.local` containing:
   ```env
   NEXT_PUBLIC_API_URL=https://<random-id>.trycloudflare.com/api
   NEXT_PUBLIC_WS_URL=wss://<random-id>.trycloudflare.com
   ```
5. Displays instructions on how to test the frontend with this tunnel.

### 3. Deploy Frontend to Cloudflare Workers
Deploy the Next.js web application to Cloudflare Workers:

```bash
# Build and deploy with your chosen API endpoint
cd apps/web
npx opennextjs-cloudflare build
npx wrangler deploy
```

Live frontend address:
`https://3d-truck.sreehariradhakrishnan2000.workers.dev`

---

## 🏢 Permanent Production Deployment (Named Tunnel + Custom Domain)

For a permanent 24/7 production deployment:

### 1. Cloudflare Named Tunnel Setup
1. In [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/):
   - Go to **Networks** → **Tunnels** → **Add a tunnel**.
   - Choose **Cloudflared**.
   - Name your tunnel (e.g., `cargoflow-api-prod`).
2. Add a Public Hostname:
   - Subdomain: `api`
   - Domain: `your-verified-domain.com`
   - Service: `HTTP` → `api:3001` (or `localhost:3001`)
   - Under **Additional application settings** → Enable **WebSockets** and **HTTP/2 to origin**.
3. Obtain your tunnel token and put it in `.env.production` as `CLOUDFLARE_TUNNEL_TOKEN`.

### 2. Containerized Production Stack
On your cloud server (VPS, AWS EC2, GCP Compute Engine, or local host):
```bash
# Start API + BullMQ Worker + Redis + Cloudflared Tunnel
docker compose -f docker-compose.cloudflare.yml --env-file .env.production up -d --build
```

### 3. Frontend Worker Configuration
In Cloudflare Workers Dashboard → `3d-truck` Worker → **Settings** → **Variables and Secrets**:
- `NODE_ENV`: `production`
- `NEXT_PUBLIC_API_URL`: `https://api.your-verified-domain.com/api`
- `NEXT_PUBLIC_WS_URL`: `wss://api.your-verified-domain.com`

---

## 🛠️ Verification & Diagnostic Tooling

The repository includes automated diagnostic and audit scripts:

### 1. Production Configuration & Security Audit
Scans the codebase to ensure zero hardcoded `localhost` or placeholder domains (`cargoflow.com`, `example.com`, `yourdomain.com`) leak into production builds:
```bash
npm run audit:production-config
```

### 2. Live Deployment Diagnostic Suite
Validates HTML delivery, cache headers, MIME-type safeguards on missing chunks, API health, CORS preflight headers, and Socket.IO handshakes:
```bash
# Check frontend worker only:
npm run diagnose:deployment

# Check frontend worker + API + WebSockets:
npm run diagnose:deployment -- --api https://<your-api-url>/api --ws wss://<your-api-url>
```

### 3. Monorepo Quality & Typecheck
```bash
# Run all unit and integration tests
npm test

# Run end-to-end integration tests (database, auth, concurrency, packing)
npm run test:e2e

# Monorepo typecheck
npm run typecheck
```

---

## 🔒 Security & Performance Considerations

1. **No Stale HTML / Chunk Mismatches**:
   The root HTML document is served with `Cache-Control: no-cache, no-store, max-age=0, must-revalidate` to ensure clients always receive chunk hashes corresponding to the active deployment.
2. **Strict MIME-type Protection**:
   Cloudflare Edge middleware intercepts requests for missing `/_next/static/*` files and returns a `text/plain` 404 response rather than the HTML fallback document. This prevents browser strict MIME type security exceptions (`Refused to execute script... because its MIME type ('text/html') is not executable`).
3. **CORS Preflight Redirection Prevention**:
   The NestJS backend explicitly handles CORS preflight `OPTIONS` requests and returns 200/204 without redirecting, preventing browser CORS preflight blocks.
4. **Optimistic Concurrency**:
   Every load placement modification increments the load version. Stale edits are rejected with `409 Conflict`, preventing concurrent editing overwrites.

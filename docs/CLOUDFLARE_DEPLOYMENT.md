# CargoFlow — Cloudflare Production Deployment Guide

This guide details the step-by-step instructions for deploying **CargoFlow** into production using **Cloudflare Workers (OpenNext)**, **Cloudflare Zero-Trust Tunnels**, **Neon PostgreSQL**, and **BullMQ/Redis**.

---

## 🏗️ Architecture Summary

* **Frontend**: Next.js 14 App Router deployed to **Cloudflare Workers** using `@opennextjs/cloudflare`.
* **API**: NestJS REST & Socket.IO server running in Docker, exposed via **Cloudflare Tunnel (`cloudflared`)** at `api.yourdomain.com`.
* **Database**: **Neon Serverless PostgreSQL** with PgBouncer connection pooling and mandatory SSL.
* **Worker**: Dedicated **BullMQ** Node.js background process for heavy 3D packing engine computations.
* **Cache/Queue**: **Redis 7** (self-hosted in compose or Upstash Serverless).

---

## A. Exact Cloudflare Dashboard Settings

### 1. Cloudflare Workers (Frontend)
1. Go to **Cloudflare Dashboard** → **Workers & Pages** → **Create application** → **Workers** tab.
2. Link your Git repository (e.g. `sreehariradhakrishnan2000/3D-Truck`).
3. Set the following build settings:
   - **Framework preset**: `Next.js`
   - **Root directory**: `apps/web`
   - **Build command**: `npx opennextjs-cloudflare build`
   - **Deploy command**: `npx wrangler deploy`
4. In **Settings** → **Compatibility Flags**:
   - **Compatibility date**: `2024-09-23` (or newer)
   - **Compatibility flags**: Add `nodejs_compat`
5. In **Settings** → **Variables and Secrets**:
   - Add Plaintext Variable: `NODE_ENV` = `production`
   - Add Plaintext Variable: `NEXT_PUBLIC_API_URL` = `https://api.yourdomain.com/api`
   - Add Plaintext Variable: `NEXT_PUBLIC_WS_URL` = `https://api.yourdomain.com`

---

## B. Exact Environment Variables to Create

### Public Frontend Variables (Set in Cloudflare Workers Dashboard)
```ini
NEXT_PUBLIC_API_URL="https://api.yourdomain.com/api"
NEXT_PUBLIC_WS_URL="https://api.yourdomain.com"
```

### Private Backend Variables (Set in `.env.production` on API Server)
```ini
# Neon PostgreSQL pooled connection with SSL required
DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-solitary-frost-a50e9766-pooler.us-east-2.aws.neon.tech/cargoflow?sslmode=require"

# Redis cache and BullMQ job queue
REDIS_URL="redis://redis:6379"

# Cryptographic JWT Secret (Minimum 64 chars)
JWT_SECRET="GENERATE_A_64_CHAR_RANDOM_SECRET_WITH_OPENSSL_RAND_BASE64_48"

# Runtime options
PORT=3001
NODE_ENV="production"
WEB_URL="https://yourdomain.com"
CORS_ORIGIN="https://yourdomain.com,https://cargoflow-web.pages.dev"
COOKIE_DOMAIN=".yourdomain.com"
COOKIE_SAMESITE="lax"
WORKER_CONCURRENCY=4

# Cloudflare Zero Trust Tunnel Runner Token
CLOUDFLARE_TUNNEL_TOKEN="YOUR_CLOUDFLARE_TUNNEL_TOKEN"
```

---

## C. Exact GitHub Integration Settings

To avoid duplicate or conflicting deployments:
* **Primary Deployment Mechanism**: Cloudflare Workers native Git Integration connects directly to the repository `main` branch.
* **GitHub Actions**: Configured solely for CI validation (`.github/workflows/ci.yml`), running lint, typecheck, unit tests, and build checks on pull requests and pushes.
* Under GitHub Repository **Settings** → **Branches**, set `main` as default with protected branch status requiring status checks to pass before merging.

---

## D. Exact Commands to Run Locally

```bash
# 1. Install dependencies across all workspaces
npm install

# 2. Generate Prisma Client for PostgreSQL
npm run prisma:generate

# 3. Run all package and service unit tests (31/31 tests)
npm test --workspaces --if-present

# 4. Run typecheck across the monorepo
npm run typecheck

# 5. Build core packages
npm run build:api
npm run build:worker
npm run build:web:worker
```

---

## E. Exact Deployment Steps

### Step 1: Deploy Database Migrations to Neon
From your machine (with your Neon `DATABASE_URL` in `.env`):
```bash
npm run db:migrate:prod
```

### Step 2: Deploy Frontend to Cloudflare Workers
#### Option 1: Automatic
Push changes to GitHub:
```bash
git push origin main
```
Cloudflare Workers Builds will automatically build and deploy the worker.

#### Option 2: Wrangler CLI
```bash
npm run build:web:worker
npm run deploy:worker
```

### Step 3: Deploy Backend Services via Cloudflare Tunnel
On your production Linux server / VPS:
1. Clone the repository:
   ```bash
   git clone https://github.com/sreehariradhakrishnan2000/3D-Truck.git cargoflow
   cd cargoflow
   ```
2. Create `.env.production` from `.env.production.example`:
   ```bash
   cp .env.production.example .env.production
   nano .env.production
   ```
3. Start the container stack (API + BullMQ Worker + Redis + Cloudflared):
   ```bash
   docker compose -f docker-compose.cloudflare.yml --env-file .env.production up -d --build
   ```

---

## F. Exact DNS & Domain Steps

In the **Cloudflare Dashboard** under your domain DNS management:
1. When you configure the Cloudflare Tunnel public hostname, Cloudflare automatically creates a **CNAME** record:
   - Name: `api`
   - Target: `<TUNNEL_ID>.cfargotunnel.com`
   - Proxy status: **Proxied (Orange Cloud)**
2. In Workers & Pages, assign your Custom Domain to the worker:
   - Worker → **Settings** → **Triggers** → **Custom Domains** → Add `yourdomain.com` (and/or `app.yourdomain.com`).
   - Cloudflare automatically routes apex traffic to your Next.js worker.

---

## G. Exact Cloudflare Tunnel Steps

1. In [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/):
   - Go to **Networks** → **Tunnels** → **Add a tunnel**.
   - Select **Cloudflared**.
   - Name: `cargoflow-prod-tunnel`.
2. Save the **Tunnel Token** provided in the install command.
3. Configure the **Public Hostname**:
   - Subdomain: `api`
   - Domain: `yourdomain.com`
   - Path: (leave empty)
   - Type: `HTTP`
   - URL: `api:3001`
4. Under **Additional application settings**:
   - **HTTP Settings**:
     - Enable **HTTP/2 to origin**
     - Enable **No TLS Verify** (if using self-signed internal TLS)
     - Enable **WebSockets** (Crucial for Socket.IO real-time collaboration!)
5. Paste the token into `CLOUDFLARE_TUNNEL_TOKEN` in your `.env.production`.

---

## H. Exact Neon Setup Steps

1. Sign up / Log in to [Neon Console](https://console.neon.tech/).
2. Create a project: `cargoflow-prod`.
3. In **Dashboard**, copy the **Pooled connection string**.
   Ensure `?sslmode=require` is present at the end:
   ```
   postgresql://neondb_owner:PASS@ep-pooler.us-east-2.aws.neon.tech/cargoflow?sslmode=require
   ```
4. Run migrations using the pooled connection:
   ```bash
   npx prisma migrate deploy --schema=prisma/schema.prisma
   ```

---

## I. Exact Redis Setup Steps

### Option A: Self-Hosted Docker (Default)
Included automatically in `docker-compose.cloudflare.yml`. Runs persistent `redis:7-alpine` on internal container network `redis:6379`.

### Option B: Upstash Serverless Redis (Managed)
1. Create a Redis database at [Upstash Console](https://console.upstash.com/).
2. Select your closest AWS region to Neon (e.g. `us-east-2`).
3. Copy the `rediss://` TLS connection URL.
4. Set `REDIS_URL="rediss://default:PASS@endpoint.upstash.io:6379"` in `.env.production`.

---

## J. Post-Deployment Verification Checklist

| Test | Expected Output | Verification Method |
|---|---|---|
| **API Health Check** | `{"status":"ok","uptimeSec":...}` | `curl -f https://api.yourdomain.com/api/health` |
| **Database Readiness** | `{"status":"ready","database":"connected"}` | `curl -f https://api.yourdomain.com/api/ready` |
| **Cloudflare Worker Frontend** | HTTP 200 with HTML shell | `curl -I https://yourdomain.com` |
| **Security Headers** | `X-Frame-Options: SAMEORIGIN`, `nosniff` | DevTools Network Tab / curl |
| **Real-time WebSockets** | 101 Switching Protocols over `/ws` | Check load detail page collaboration indicator |
| **3D Three.js Studio** | WebGL Canvas renders truck & packages | Open `/loads/[id]` in browser & mobile Safari |
| **3D Auto-Pack Engine** | Placements computed, progress emitted | Click **Auto-Pack** button on load planner |
| **BullMQ Worker Logs** | `[CargoFlow Worker] Successfully connected` | `docker compose -f docker-compose.cloudflare.yml logs worker` |

---

## K. Architecture Notes & Best Practices

1. **Heavy Computation Isolation**: 3D packing computations execute on the dedicated BullMQ worker container, never against Cloudflare Edge CPU limits.
2. **Dynamic 3D Component Loading**: Three.js and OrbitControls are dynamically imported on the client (`ssr: false`), preventing server hydration bugs and cutting first load JS to ~137 kB.
3. **Database Migration Safety**: Migrations run explicitly via `npm run db:migrate:prod`, preventing race conditions during rolling container restarts.

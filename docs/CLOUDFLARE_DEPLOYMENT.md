# CargoFlow — Cloudflare Production Deployment Guide

This guide details how to deploy **CargoFlow** into production using **Cloudflare Pages**, **Cloudflare Zero Trust Tunnels**, and **Neon PostgreSQL**.

---

## 🏗️ Production Architecture Overview

```
                          ┌──────────────────────────────────────────────┐
                          │            Cloudflare Global Edge            │
                          │   (DDoS Protection, SSL/TLS, Caching, WAF)   │
                          └───────┬──────────────────────────────┬───────┘
                                  │                              │
                    HTTPS Requests│                              │WebSocket & API
                                  ▼                              ▼
                 ┌─────────────────────────────────┐   ┌────────────────────────────────┐
                 │        Cloudflare Pages         │   │       Cloudflare Tunnel        │
                 │   Next.js 14 Web Frontend       │   │         (cloudflared)          │
                 │  - 3D Three.js Studio           │   └───────────────┬────────────────┘
                 │  - SSR + Edge Cache             │                   │ Zero-Inbound Tunnel
                 │  - Security Headers             │                   ▼
                 └─────────────────────────────────┘   ┌────────────────────────────────┐
                                                       │       Dockerized Backend       │
                                                       │   - NestJS API (Port 3001)     │
                                                       │   - Socket.io Real-time WS     │
                                                       │   - Packing Optimization Eng   │
                                                       └───────────────┬────────────────┘
                                                                       │
                                                       ┌───────────────┴────────────────┐
                                                       │  Neon Serverless PostgreSQL    │
                                                       │   (Connection Pooling + SSL)   │
                                                       └────────────────────────────────┘
```

---

## 📋 Prerequisites

1. **Cloudflare Account**: [dash.cloudflare.com](https://dash.cloudflare.com/) with your domain (e.g., `cargoflow.com`) added.
2. **Neon Database**: Serverless PostgreSQL database connection string with `sslmode=require`.
3. **GitHub Repository**: For automated CI/CD deployment via GitHub Actions.
4. **Docker & Docker Compose**: For hosting the backend services.

---

## 1️⃣ Database Setup (Neon PostgreSQL)

1. Create a project in [Neon Console](https://console.neon.tech).
2. Copy the **Pooled Connection String** (format):
   ```
   postgresql://cargoflow_owner:YOUR_PASSWORD@ep-solitary-frost-a50e9766-pooler.us-east-2.aws.neon.tech/cargoflow?sslmode=require
   ```
3. Run the migrations from your development machine or CI:
   ```bash
   npx prisma migrate deploy --schema=prisma/schema.prisma
   ```

---

## 2️⃣ Deploy Web Frontend to Cloudflare Pages

### Option A: Automatic Deployment via GitHub Actions (Recommended)

The repository includes `.github/workflows/deploy-cloudflare.yml`.

1. Go to your GitHub repository **Settings** → **Secrets and variables** → **Actions**.
2. Add the following repository secrets:
   - `CLOUDFLARE_API_TOKEN`: Create at [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens) with `Cloudflare Pages: Edit` permissions.
   - `CLOUDFLARE_ACCOUNT_ID`: Found on your Cloudflare dashboard right-hand sidebar.
   - `NEXT_PUBLIC_API_URL`: e.g. `https://api.yourdomain.com/api`
   - `NEXT_PUBLIC_WS_URL`: e.g. `https://api.yourdomain.com`
3. Push to `main` branch:
   ```bash
   git push origin main
   ```
   GitHub Actions will automatically build all workspaces and deploy the web application to Cloudflare Pages.

### Option B: Deploy via Cloudflare Pages Dashboard

1. In Cloudflare Dashboard, go to **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
2. Select your repository.
3. Configure build settings:
   - **Framework preset**: `Next.js`
   - **Root directory**: `/`
   - **Build command**: `npm run build --workspace=@cargoflow/shared-types && npm run build --workspace=@cargoflow/geometry && npm run build --workspace=@cargoflow/validation && npm run build --workspace=@cargoflow/packing-engine && npm run build --workspace=@cargoflow/web`
   - **Build output directory**: `apps/web/.next`
4. Add Environment Variables:
   - `NODE_VERSION`: `20`
   - `NEXT_PUBLIC_API_URL`: `https://api.yourdomain.com/api`
   - `NEXT_PUBLIC_WS_URL`: `https://api.yourdomain.com`
5. Click **Save and Deploy**.

### Option C: Manual CLI Deployment with Wrangler

```bash
# 1. Install or authenticate Wrangler
npx wrangler login

# 2. Build the monorepo
npm run build

# 3. Deploy to Cloudflare Pages
npm run deploy:cloudflare
```

---

## 3️⃣ Deploy NestJS API & WebSockets with Cloudflare Tunnel

Cloudflare Tunnel (`cloudflared`) connects your Dockerized NestJS API and WebSockets securely to Cloudflare Edge without exposing any inbound ports on your server.

### Step 1: Create a Cloudflare Tunnel

In the [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/):
1. Navigate to **Networks** → **Tunnels** → **Add a tunnel**.
2. Name your tunnel: `cargoflow-tunnel`.
3. Copy the **Tunnel Token** generated by Cloudflare.

### Step 2: Configure Public Hostnames in Tunnel Settings

In your tunnel configuration, add a public hostname:
- **Subdomain**: `api` (e.g., `api.yourdomain.com`)
- **Service Type**: `HTTP`
- **URL**: `api:3001`
- Under **Additional application settings** → **HTTP Settings**:
  - Enable **HTTP/2 to origin**
  - Enable **WebSockets**

### Step 3: Run with Docker Compose

1. Copy `.env.production.example` to `.env.production`:
   ```bash
   cp .env.production.example .env.production
   ```
2. Fill in the values:
   ```ini
   DATABASE_URL="postgresql://user:pass@ep-pooler.neon.tech/cargoflow?sslmode=require"
   JWT_SECRET="generate-a-secure-random-64-char-string"
   WEB_URL="https://cargoflow.com"
   CLOUDFLARE_TUNNEL_TOKEN="YOUR_COPIED_TUNNEL_TOKEN"
   ```
3. Start the production stack:
   ```bash
   docker compose -f docker-compose.cloudflare.yml up -d
   ```
4. Verify all containers are healthy:
   ```bash
   docker compose -f docker-compose.cloudflare.yml ps
   ```

---

## 4️⃣ Production Verification Checklist

| Check | Expected Result | Command / URL |
|---|---|---|
| **API Health** | HTTP 200 `{"status":"ok"}` | `curl -f https://api.yourdomain.com/api/health` |
| **API Readiness** | HTTP 200 `{"status":"ready"}` | `curl -f https://api.yourdomain.com/api/ready` |
| **Web App** | HTTP 200 & Rendered UI | `curl -I https://yourdomain.com` |
| **Security Headers** | `X-Frame-Options: SAMEORIGIN` | Inspected via browser DevTools or `curl -I` |
| **WebSockets** | Successful handshake (`/ws`) | Load detail page live sync |
| **3D Canvas** | WebGL canvas rendered | Open any load at `/loads/[id]` |

---

## 5️⃣ Rolling Updates & Maintenance

To pull latest code and trigger a zero-downtime rolling update:

```bash
git pull origin main
docker compose -f docker-compose.cloudflare.yml build
docker compose -f docker-compose.cloudflare.yml up -d --no-deps api web
```

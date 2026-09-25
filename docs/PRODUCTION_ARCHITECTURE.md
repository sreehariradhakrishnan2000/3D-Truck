# CargoFlow — Production Architecture Specification

This document provides the canonical production architecture specification for **CargoFlow**, an enterprise 3D truck load planning SaaS platform.

---

## 🏛️ System Architecture Diagram

```
                                  ┌─────────────────────────────┐
                                  │      Cloudflare Edge        │
                                  │  - DDoS Protection          │
                                  │  - SSL / TLS Termination    │
                                  │  - Global Anycast CDN       │
                                  │  - WAF & Rate Limiting      │
                                  └──────────────┬──────────────┘
                                                 │
                   ┌─────────────────────────────┴─────────────────────────────┐
                   │ HTTPS (Static & SSR)                                      │ HTTPS & WSS (Tunnel)
                   ▼                                                           ▼
    ┌──────────────────────────────┐                            ┌──────────────────────────────┐
    │      Cloudflare Workers      │                            │      Cloudflare Tunnel       │
    │   (OpenNext Next.js 14)      │                            │        (cloudflared)         │
    │  - 3D Viewer Studio Shell    │                            │  - Zero inbound open ports   │
    │  - App Router SSR & Pages    │                            │  - Encrypted outbound egress │
    │  - Edge Static Asset Cache   │                            └──────────────┬───────────────┘
    └──────────────────────────────┘                                           │
                                                                               ▼
                                                                ┌──────────────────────────────┐
                                                                │      NestJS API Server       │
                                                                │  - REST Controllers          │
                                                                │  - Socket.io Real-time WS    │
                                                                │  - RBAC & Argon2 Auth        │
                                                                │  - /health & /ready probes   │
                                                                │  - Graceful Shutdown         │
                                                                └───────┬──────────────┬───────┘
                                                                        │              │
                                                        Job Enqueue     │              │ Prisma ORM
                                                        & Presence      │              │ (Pooled SSL)
                                                                        ▼              ▼
                                                        ┌────────────────┐   ┌─────────────────┐
                                                        │  Redis 7 /     │   │ Neon Serverless │
                                                        │  Upstash       │   │ PostgreSQL      │
                                                        └───────┬────────┘   │ (?sslmode=req)  │
                                                                │            └────────┬────────┘
                                                         Job    │                     │
                                                         Poll   ▼                     │ Read / Write
                                                        ┌────────────────┐            │
                                                        │ BullMQ Worker  │────────────┘
                                                        │ (3D Packer)    │
                                                        │  - Heuristics  │
                                                        │  - Weight/CoG  │
                                                        │  - Sequence    │
                                                        └────────────────┘
```

---

## 🧩 Architectural Component Breakdown

### 1. Frontend: Next.js 14 on Cloudflare Workers (OpenNext)
* **Adapter**: Built via `@opennextjs/cloudflare` producing a native V8 edge worker bundle (`.open-next/worker.js`) and static CDN assets (`.open-next/assets`).
* **3D Engine Isolation**: `@react-three/fiber` and Three.js components are dynamically loaded (`ssr: false`) to:
  1. Prevent WebGL/window hydration errors during server execution.
  2. Slash initial worker bundle by over **80%** (137 kB first load JS).
  3. Ensure 100% mobile Safari and desktop browser compatibility.
* **Asset Acceleration**: Static assets (fonts, icons, WebGL textures) are served directly from Cloudflare Global Cache edge with immutable caching headers.

### 2. API Backend: Containerized NestJS
* **Host Environment**: Docker container (`apps/api/Dockerfile`) running on a secure Linux VM/VPS or container orchestration service.
* **Ingress**: Exposed **exclusively** through Cloudflare Tunnel (`cloudflared`). The host firewall denies all public inbound traffic on port 3001.
* **Real-time WebSockets**: Socket.IO namespace `/ws` runs on the same HTTP server with WebSocket upgrade support routed through Cloudflare Tunnel.
* **Resilience**:
  - `app.enableShutdownHooks()` handles container `SIGTERM` / `SIGINT` signals.
  - Active transactions complete before process termination.
  - `/ready` endpoint queries `SELECT 1` against PostgreSQL to prevent routing traffic before database readiness.

### 3. Database: Neon Serverless PostgreSQL
* **Security**: SSL required (`sslmode=require`) on all connections.
* **Connection Pooling**: Utilizes Neon's built-in PgBouncer pooler (`-pooler` endpoint) to support high-concurrency serverless and containerized connections without exhausting database connections.
* **Migration Strategy**: Migrations run explicitly via CI/CD or controlled CLI (`npm run db:migrate:prod`), **never** automatically on application container boot, preventing distributed race conditions during rolling deployments.

### 4. Queue & Background Processing: BullMQ + Redis
* **Heavy Compute Offloading**: 3D bin packing optimization algorithms (Greedy, Best-Fit-Decreasing, loading sequence calculation) execute in the isolated BullMQ worker process (`apps/worker`).
* **Edge Protection**: Heavy CPU calculation is strictly prohibited from running on Cloudflare Workers edge runtime (which enforces strict 50ms/30s CPU limits).
* **Fault Tolerance**:
  - Reconnection retry strategy with exponential backoff.
  - Automatic failed job capturing, logging, and progress reporting back to the API.

---

## 🔒 Production Security Model

| Security Layer | Implementation |
|---|---|
| **DDoS & WAF** | Cloudflare Edge inspects all traffic before it hits the origin. |
| **Origin Isolation** | Cloudflare Tunnel requires zero open inbound firewall ports. |
| **Transport Security** | TLS 1.3 edge-to-client; encrypted tunnel edge-to-origin. |
| **Authentication** | Cryptographic Argon2 password hashing + stateless JWT with rotating refresh tokens stored in `HttpOnly; Secure; SameSite=Lax` cookies. |
| **HTTP Security Headers** | Helmet-applied headers: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`. |
| **CORS Policy** | Whitelist-based origin checking supporting custom domain apex and Cloudflare preview domains. |


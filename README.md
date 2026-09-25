# CargoFlow 🚛

**Real-time 3D truck/trailer load planning platform**

A production-quality SaaS application for cargo load planning with 3D visualization, real-time collaboration, and intelligent auto-packing.

---

## Quick Start

### Prerequisites
- Node.js 20+
- Docker Desktop (for PostgreSQL + Redis)
- Git

### 1. Install Docker Desktop

Download and install from: https://www.docker.com/products/docker-desktop/

After installing, start Docker Desktop and wait until it shows "Docker Desktop is running".

### 2. Clone and Install

```bash
git clone <repo-url>
cd cargoflow
npm install
```

### 3. Start Database Services

```bash
docker compose up -d
```

This starts:
- PostgreSQL 16 on port 5432
- Redis 7 on port 6379

### 4. Run Database Migrations

```bash
npx prisma migrate dev --name init --schema=prisma/schema.prisma
```

### 5. Seed Demo Data

```bash
npx ts-node --project prisma/tsconfig.json prisma/seed.ts
```

Demo accounts created:
- `admin@cargoflow.demo` / `Admin123!`
- `planner@cargoflow.demo` / `Planner123!`
- `driver@cargoflow.demo` / `Driver123!`

### 6. Start the API

```bash
npm run dev:api
```

API will be available at: http://localhost:3001/api

Health check: http://localhost:3001/api/health

---

## Architecture

```
cargoflow/
├── apps/
│   ├── api/         # NestJS REST API + WebSocket server
│   ├── web/         # Next.js 14 frontend (Phase 2)
│   └── worker/      # BullMQ background jobs (Phase 3)
├── packages/
│   ├── shared-types/    # TypeScript types, enums, DTOs
│   ├── geometry/        # 3D math: AABB, rotations, collision, CoG
│   ├── validation/      # Zod schemas + server-side load validator
│   └── packing-engine/  # Greedy extreme-point 3D bin packing
├── prisma/          # Prisma schema + migrations + seed
├── docker-compose.yml
└── .env.example
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register + create organization |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user |
| GET | `/api/vehicles` | List vehicles |
| POST | `/api/vehicles` | Create vehicle/trailer |
| GET | `/api/package-definitions` | List package types |
| POST | `/api/package-definitions` | Create package type |
| GET | `/api/loads` | List loads |
| POST | `/api/loads` | Create load |
| GET | `/api/loads/:id` | Get full load with packages + placements |
| PATCH | `/api/loads/:id` | Update load (version-locked) |
| POST | `/api/loads/:id/packages` | Add package to load |
| POST | `/api/loads/:id/placements` | Place a package (server-validated) |
| DELETE | `/api/loads/:id/placements/:pid` | Remove placement |
| GET | `/api/loads/:id/validation` | Full load validation report |
| GET | `/api/health` | Health check |

## WebSocket Events

Connect to `/ws` with JWT in auth header.

| Event | Direction | Description |
|-------|-----------|-------------|
| `joinLoad` | Client → Server | Join a load editing room |
| `leaveLoad` | Client → Server | Leave a load room |
| `user.joined` | Server → Client | Another user joined |
| `user.left` | Server → Client | Another user left |
| `placement.added` | Server → Client | Package placed |
| `placement.updated` | Server → Client | Package moved |
| `placement.removed` | Server → Client | Package unplaced |
| `load.conflict` | Server → Client | Version conflict detected |

## Concurrency Protection

Placement mutations use `SELECT FOR UPDATE` on the Load row inside a Prisma `$transaction`. The flow:

1. Lock Load row
2. Check `version` matches client's expected version → 409 if stale
3. Check placement is within trailer bounds
4. Check for collisions with all existing placements
5. Upsert placement
6. Increment `load.version`

This guarantees that two users placing at the same spot simultaneously will result in exactly one winner and one 409 conflict response.

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React, TypeScript, Tailwind CSS, React Three Fiber |
| Backend | NestJS, TypeScript, REST + WebSockets |
| Database | PostgreSQL 16, Prisma ORM |
| Cache/Queue | Redis 7, BullMQ |
| 3D Engine | Three.js via React Three Fiber |
| Auth | Argon2id, JWT (15min access + 30d refresh, HTTP-only cookie) |
| Geometry | Custom AABB engine (packages/geometry) |
| Packing | Greedy extreme-point algorithm (packages/packing-engine) |
| Dev | Docker Compose, npm workspaces |


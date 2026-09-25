# CargoFlow 🚛

> **Production-quality real-time 3D truck/trailer load planning SaaS platform.**
>
> ⚠️ **FOR AI ASSISTANTS**: This README is the **single source of truth** for this project.
> Before making ANY changes, read this entire document. Do NOT deviate from the architecture,
> technology choices, naming conventions, or design decisions described here unless explicitly
> instructed by the user. Do NOT rewrite working code. Do NOT change the monorepo structure.

---

## Table of Contents

1. [Project Vision](#1-project-vision)
2. [Technology Stack](#2-technology-stack) — **do not change these choices**
3. [Monorepo Architecture](#3-monorepo-architecture)
4. [Architecture Decisions Log](#4-architecture-decisions-log) — **read before coding**
5. [Database Schema](#5-database-schema)
6. [API Reference](#6-api-reference)
7. [WebSocket Events](#7-websocket-events)
8. [Internal Coordinate System](#8-internal-coordinate-system)
9. [Roles & Permissions](#9-roles--permissions)
10. [Quick Start](#10-quick-start)
11. [Development Status](#11-development-status) — **current phase tracker**
12. [Phase Roadmap](#12-phase-roadmap) — **what to build next**
13. [Coding Conventions](#13-coding-conventions)
14. [Environment Variables](#14-environment-variables)

---

## 1. Project Vision

CargoFlow is a web application where logistics companies can:

- Create vehicles and trailers with configurable dimensions
- Define reusable package/cargo types
- Create load plans and add packages to them
- View and edit the trailer as an **interactive 3D environment**
- Manually drag/drop packages into the trailer, rotate them, detect collisions in real time
- Run an **auto-pack algorithm** that optimally arranges packages
- **Collaborate in real time** — multiple users can work on the same load simultaneously
- Validate loads for weight, collision, stackability, door clearance, and center of gravity
- Generate loading sequences and printable load plans
- Operate as a **multi-tenant SaaS** — each company (Organization) is fully isolated

**Key non-negotiables:**
- Real backend, real database — no mocks, no localStorage as source of truth
- Server-authoritative state — all placements validated on the backend
- Real real-time sync — actual WebSocket events, not polling
- No hardcoded positions or trailer sizes
- Production-quality code throughout

---

## 2. Technology Stack

> ⚠️ **AI ASSISTANTS**: Do NOT change these technology choices. Do NOT introduce alternatives
> (e.g., Drizzle instead of Prisma, Fastify instead of NestJS, pnpm instead of npm).
> These are fixed decisions for this project.

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| **Package manager** | npm workspaces | npm 11+ | Plain npm, no Turborepo/pnpm |
| **Frontend framework** | Next.js (App Router) | 14+ | |
| **UI library** | React + TypeScript | 18+ | |
| **Styling** | Tailwind CSS + shadcn/ui | | Apple-like clean aesthetic |
| **3D engine** | React Three Fiber + Three.js | | `@react-three/drei` for helpers |
| **Client state** | Zustand | | High-frequency planner state only |
| **Server state** | TanStack Query | | All API calls |
| **Forms** | React Hook Form + Zod | | |
| **Backend framework** | NestJS | 10+ | TypeScript throughout |
| **Database** | PostgreSQL 16 | | Via Docker Compose |
| **ORM** | Prisma | 5+ | Schema at `/prisma/schema.prisma` |
| **Cache/Queue** | Redis 7 + BullMQ | | Via Docker Compose |
| **Real-time** | Socket.IO | 4+ | Namespace `/ws` |
| **Auth** | Argon2id + JWT | | Access token 15min, refresh 30d |
| **Validation** | Zod | | Shared between frontend and backend |
| **Dev environment** | Docker Compose | | postgres + redis only; apps run locally |
| **Testing** | Vitest (unit) + Playwright (E2E) | | |

---

## 3. Monorepo Architecture

```
cargoflow/                          ← npm workspace root
├── apps/
│   ├── api/                        ← NestJS backend (port 3001)
│   ├── web/                        ← Next.js 14 frontend (port 3000)
│   └── worker/                     ← BullMQ job worker
│
├── packages/
│   ├── shared-types/               ← TypeScript types, enums, DTOs, WS event names
│   ├── geometry/                   ← 3D math: AABB, rotations, collision, CoG, volume
│   ├── validation/                 ← Zod schemas + server-side load validator
│   ├── packing-engine/             ← Greedy extreme-point 3D bin packing algorithm
│   └── ui/                         ← Reusable design system library (Button, Card, Badge, KpiCard)
│
├── prisma/
│   ├── schema.prisma               ← Single source of truth for DB schema
│   ├── seed.ts                     ← Demo data seeder
│   └── tsconfig.json               ← For ts-node seed execution
│
├── docs/                           ← Complete technical architecture & deployment guides
│   ├── ARCHITECTURE.md             ← System topology, 3D math & concurrency model
│   ├── API.md                      ← REST endpoints & WebSocket events reference
│   └── DEPLOYMENT.md               ← Production Docker, Cloud Run & ECS deployment
│
├── docker/                         ← Docker deployment configurations
│   ├── init-db.sql                 ← PostgreSQL extensions initialization script
│   └── nginx.conf                  ← Production reverse proxy configuration
│
├── tests/                          ← End-to-end automated integration tests
│   └── platform-flow.spec.ts       ← Full multi-tenant SaaS lifecycle test suite
│
├── docker-compose.yml              ← Local dev: PostgreSQL 16 + Redis 7
├── docker-compose.prod.yml         ← Production multi-container full stack orchestration
├── .github/workflows/ci.yml        ← GitHub Actions CI pipeline
├── .env                            ← Local dev secrets (gitignored)
├── .env.example                    ← Template for env vars
├── package.json                    ← Workspace root
└── README.md                       ← THIS FILE — single source of truth
```

### Package Dependency Graph

```
shared-types   (no internal deps)
    ↑
geometry       (depends on: shared-types)
    ↑
validation     (depends on: shared-types, geometry)
    ↑
packing-engine (depends on: shared-types, geometry, validation)
    ↑
apps/api       (depends on: shared-types, geometry, validation)
apps/web       (depends on: shared-types, validation, packing-engine)
apps/worker    (depends on: shared-types, packing-engine)
```

---

## 4. Architecture Decisions Log

> ⚠️ **AI ASSISTANTS**: These decisions are FINAL. Do not reopen them.

### ADR-001: npm workspaces (not Turborepo/pnpm)
Node 24 + npm 11 are installed. Plain npm workspaces provide everything needed without additional tooling. **Do not change to pnpm or add Turborepo.**

### ADR-002: Coordinate System
- **X axis** = trailer length (front → rear door)
- **Y axis** = trailer width (left → right)
- **Z axis** = vertical height (floor → ceiling)
- **Origin** = front-left-bottom interior corner of the trailer
- All dimensions stored in **millimeters (mm)**
- All weights stored in **kilograms (kg)**
- The UI may display cm/m/tons but the canonical unit is always mm/kg

### ADR-003: Six Box Rotations (RotationIndex 0–5)
Each package has 6 possible axis-aligned orientations encoded as `RotationIndex`:
```
0: L×W×H  (default)
1: L×H×W  (rotated 90° around X)
2: W×L×H  (rotated 90° around Z)
3: W×H×L  (rotated 90° around Z + 90° around X)
4: H×L×W  (rotated 90° around Y)
5: H×W×L  (rotated 90° around Y + 90° around Z)
```
The rotation matrix lives in `packages/geometry/src/rotations.ts`. **Do not change the rotation encoding.**

### ADR-004: Server-Authoritative Placement with Optimistic Locking
- Each `Load` has an integer `version` field, starting at 1
- Every mutation (place/move/remove package) increments `load.version`
- Clients must send the current `loadVersion` with every placement request
- Backend uses `SELECT FOR UPDATE` inside a `$transaction` to lock the Load row
- If `load.version !== dto.loadVersion` → HTTP 409 `STALE_LOAD_VERSION`
- Frontend shows optimistic update, reverts on 409
- **This is the only concurrency model. Do not implement client-side locking.**

### ADR-005: Placement API Contract
```
POST /api/loads/:loadId/placements
Body: { loadPackageId, x, y, z, rotationIndex, loadVersion }

Validation order (all on backend):
1. Lock Load row (SELECT FOR UPDATE)
2. Version check → 409 if mismatch
3. Package belongs to load → 404 if not
4. Vehicle exists → 404 if not
5. Rotation is in allowedRotations → 400 if invalid
6. Package fits in trailer (containment) → 400 if outside
7. No collision with existing placements → 409 if overlap
8. Package is supported (floor or other package below) → 400 if floating
9. Upsert placement (one placement per loadPackage)
10. Increment load.version
```

### ADR-006: WebSocket Architecture
- Socket.IO on namespace `/ws`
- Clients authenticate via JWT in `handshake.auth.token`
- Rooms are named `load:{loadId}`
- Only final drop positions (not live drag events) are sent to the server
- After a successful placement API call, the frontend broadcasts the update to other users via WS
- **Do not add drag position streaming to the DB or WS — only final positions**

### ADR-007: Multi-Tenancy
- Every entity (Vehicle, Load, Package, etc.) has an `organizationId` field
- All queries MUST filter by `organizationId` from the JWT payload (`user.orgId`)
- **Never** trust `organizationId` from the request body for security checks
- Cross-organization data leakage is a critical security bug

### ADR-008: Authentication Tokens
- **Access token**: JWT, signed with `JWT_SECRET`, expires in 15 minutes
- **Refresh token**: UUID stored in `RefreshToken` table, expires in 30 days, HTTP-only cookie
- Refresh tokens are **rotated on use** (old one is revoked, new one is issued)
- Cookie path is `/api/auth` to limit scope
- In production: `secure: true`, `sameSite: 'strict'`

### ADR-009: Heavy Computation
- Auto-pack runs in a BullMQ worker (`apps/worker`)
- Small loads (<50 packages) can run in-process or in a Web Worker on the client
- **Never run expensive computation synchronously in the NestJS request handler**
- The packing engine in `packages/packing-engine` is pure TypeScript, no I/O — safe to run anywhere

### ADR-010: 3D Scene Architecture
- Three.js scene lives entirely in the browser (React Three Fiber)
- The browser is responsible for rendering ONLY
- All state mutations go through the REST API
- Zustand stores the in-memory scene state for high-frequency updates
- TanStack Query handles all API communication and caching

### ADR-011: Design Language (UI)
- Clean Apple-like aesthetic: minimal, soft, professional
- Tailwind CSS utility classes
- shadcn/ui component library (do not use MUI, Chakra, or Ant Design)
- Colors: white backgrounds, gray-50/100 cards, blue-600 accent, red-500 errors
- Rounded corners (rounded-xl cards), subtle shadows (shadow-sm)
- Mobile-first: works on iPhone Safari, Android, desktop

### ADR-012: Prisma Schema Location
- Single Prisma schema at `/prisma/schema.prisma` (root level, not inside apps/)
- Prisma client generates to `node_modules/.prisma/client`
- All apps access it via `@prisma/client` import after running `prisma generate`
- **Do not create per-app Prisma schemas**

---

## 5. Database Schema

> Full schema: [`prisma/schema.prisma`](./prisma/schema.prisma)

### Entity Overview

```
Organization (tenant)
├── OrganizationMember (userId + role)
├── User (email, passwordHash, firstName, lastName)
│   └── RefreshToken (token, expiresAt, revokedAt)
├── Vehicle (trailer dimensions in mm, maxPayloadKg)
├── PackageDefinition (dimensions in mm, weightKg, stackable, fragile, rotations)
└── Load (status, version, totalWeightKg, volumeUtilizationPct)
    ├── LoadPackage (packageDefinitionId, quantity, stopSequence, priority)
    │   └── Placement (x, y, z, rotationIndex — one per LoadPackage)
    ├── LoadingSequenceItem (sequenceOrder)
    └── AuditLog (action, previousState, newState)
```

### Key Fields

**Load.version** — Integer, starts at 1, incremented on every mutation. Used for optimistic concurrency.

**Placement** — One-to-one with LoadPackage (`@@unique([loadPackageId])`). Coordinates are in mm from trailer origin.

**PackageDefinition.allowedRotations** — `Int[]` — array of `RotationIndex` values (0-5) the package is allowed to be placed in.

---

## 6. API Reference

Base URL: `http://localhost:3001/api`

All authenticated endpoints require: `Authorization: Bearer <accessToken>`

### Auth

| Method | Path | Auth | Body | Description |
|--------|------|------|------|-------------|
| POST | `/auth/register` | No | `{ email, password, firstName, lastName, organizationName }` | Register + create org |
| POST | `/auth/login` | No | `{ email, password }` | Login |
| POST | `/auth/refresh` | Cookie | — | Rotate refresh token |
| POST | `/auth/logout` | Cookie | — | Revoke refresh token |
| GET | `/auth/me` | JWT | — | Get current user JWT payload |

### Vehicles

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/vehicles` | JWT | List org's vehicles |
| GET | `/vehicles/:id` | JWT | Get vehicle |
| POST | `/vehicles` | JWT (Planner+) | Create vehicle |
| PATCH | `/vehicles/:id` | JWT (Planner+) | Update vehicle |
| DELETE | `/vehicles/:id` | JWT (OrgAdmin) | Delete vehicle |

### Package Definitions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/package-definitions` | JWT | List (supports `?search=`) |
| GET | `/package-definitions/:id` | JWT | Get |
| POST | `/package-definitions` | JWT | Create |
| PATCH | `/package-definitions/:id` | JWT | Update |
| DELETE | `/package-definitions/:id` | JWT | Delete |

### Loads

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/loads` | JWT | List (supports `?status=`) |
| GET | `/loads/:id` | JWT | Get full load with packages + placements |
| POST | `/loads` | JWT | Create load |
| PATCH | `/loads/:id` | JWT | Update load metadata (requires `version`) |
| DELETE | `/loads/:id` | JWT | Delete load |
| GET | `/loads/:id/packages` | JWT | List load packages |
| POST | `/loads/:id/packages` | JWT | Add package to load |
| DELETE | `/loads/:id/packages/:packageId` | JWT | Remove package |

### Placements

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/loads/:loadId/placements` | JWT | List all placements for a load |
| POST | `/loads/:loadId/placements` | JWT | Place/move a package (full server validation) |
| DELETE | `/loads/:loadId/placements/:id` | JWT | Remove placement (requires `?loadVersion=N`) |

### Validation

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/loads/:loadId/validation` | JWT | Run full load validation |

### System

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Health check |
| GET | `/ready` | No | Readiness probe |

### Error Response Format

```json
{
  "statusCode": 409,
  "code": "STALE_LOAD_VERSION",
  "message": "The load was modified by someone else. Please refresh.",
  "details": { "currentVersion": 5 },
  "path": "/api/loads/.../placements",
  "timestamp": "2026-09-25T10:00:00.000Z"
}
```

### Error Codes (`ErrorCode` enum)

| Code | HTTP | Description |
|------|------|-------------|
| `PACKAGE_COLLISION` | 409 | Package overlaps with existing placement |
| `PACKAGE_OUTSIDE_TRAILER` | 400 | Package extends beyond trailer walls |
| `TRAILER_WEIGHT_EXCEEDED` | 400 | Total weight exceeds maxPayloadKg |
| `INVALID_ROTATION` | 400 | Rotation not in allowedRotations |
| `PACKAGE_NOT_SUPPORTED` | 400 | Package is floating (not on floor or another package) |
| `NON_STACKABLE` | 400 | Non-stackable package has cargo on top |
| `DOOR_CLEARANCE_FAILED` | 400 | Package won't fit through rear door |
| `STALE_LOAD_VERSION` | 409 | Load version mismatch — refresh and retry |
| `LOAD_CONFLICT` | 409 | Generic load concurrency conflict |
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `FORBIDDEN` | 403 | Insufficient role |
| `NOT_FOUND` | 404 | Entity not found |
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## 7. WebSocket Events

Connect to: `ws://localhost:3001/ws`

Auth: `{ auth: { token: '<accessToken>' } }` in Socket.IO handshake options.

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `joinLoad` | `{ loadId: string }` | Join the editing room for a load |
| `leaveLoad` | `{ loadId: string }` | Leave the editing room |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `user.joined` | `{ userId, email }` | Another user joined this load |
| `user.left` | `{ userId }` | Another user disconnected |
| `placement.added` | `PlacementDto` | A package was placed |
| `placement.updated` | `PlacementDto` | A package was moved/rotated |
| `placement.removed` | `{ placementId, loadPackageId }` | A package was unplaced |
| `load.conflict` | `{ loadId, currentVersion, message }` | Version conflict |
| `packing.started` | `{ loadId }` | Auto-pack job started |
| `packing.progress` | `{ loadId, progress, message }` | Auto-pack progress % |
| `packing.completed` | `PackingResult` | Auto-pack finished |
| `validation.updated` | `ValidationResult` | Load validation result changed |
| `error` | `{ message, code }` | Server-side error |

**Event names are constants in `@cargoflow/shared-types`** — the `WS_EVENTS` object. Always import from there, never hardcode strings.

---

## 8. Internal Coordinate System

```
        Z (height, ceiling)
        │
        │
        │
        └─────── Y (width, right side)
       /
      /
     X (length, front→rear door)
```

- **Origin (0,0,0)**: Front-left-bottom interior corner of the trailer
- **X increases** toward the rear door
- **Y increases** toward the right side wall
- **Z increases** toward the ceiling
- **Door** is at `x = interiorLength`, spanning `y ∈ [0, doorWidth]`, `z ∈ [0, doorHeight]`
- Packages loaded **last** (near the door) should have the **highest X** values
- First-to-deliver packages go near the door (high X) for accessibility

---

## 9. Roles & Permissions

Role hierarchy (higher number = more access):

| Role | Level | Can Do |
|------|-------|--------|
| `VIEWER` | 10 | View loads, packages, vehicles |
| `DRIVER` | 30 | View loads assigned to them |
| `LOADER` | 40 | View and update placement in active loads |
| `DISPATCHER` | 50 | Create/manage loads, assign drivers |
| `PLANNER` | 60 | Full load management, create vehicles and packages |
| `ORG_ADMIN` | 80 | All of above + manage org members |
| `SUPER_ADMIN` | 100 | Cross-organization access (internal use only) |

Guards implemented in: `apps/api/src/common/guards/roles.guard.ts`

The `RolesGuard` uses the hierarchy — if a route requires `PLANNER`, any role with level ≥ 60 is allowed.

---

## 10. Quick Start

### Prerequisites
- Node.js 20+ (project uses Node 24)
- Docker Desktop — https://www.docker.com/products/docker-desktop/
- npm 11+

### Setup Steps

```powershell
# 1. Install Docker Desktop, start it, wait until it shows "running"

# 2. Install dependencies
npm install

# 3. Start PostgreSQL + Redis
docker compose up -d

# 4. Verify Docker services are healthy
docker compose ps

# 5. Generate Prisma client
npx prisma generate --schema=prisma/schema.prisma

# 6. Run database migrations
npx prisma migrate dev --name init --schema=prisma/schema.prisma

# 7. Seed demo data
npx ts-node --project prisma/tsconfig.json prisma/seed.ts

# 8. Start the API
npm run dev:api
```

### Demo Accounts (after seeding)

| Email | Password | Role |
|-------|----------|------|
| `admin@cargoflow.demo` | `Admin123!` | Org Admin |
| `planner@cargoflow.demo` | `Planner123!` | Planner |
| `driver@cargoflow.demo` | `Driver123!` | Driver |

### Test the API

```powershell
# Health check
curl http://localhost:3001/api/health

# Login
curl -X POST http://localhost:3001/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"admin@cargoflow.demo","password":"Admin123!"}'
```

### Prisma Studio (visual DB browser)

```powershell
npm run prisma:studio
```

---

## 11. Development Status

> **Last updated**: 2026-09-25
> **Current Phase**: All Phases 1 through 7 COMPLETE ✅

### ✅ Phase 1 — Monorepo Foundation (COMPLETE)

| Item | Status | Notes |
|------|--------|-------|
| Root `package.json` with npm workspaces | ✅ Done | `apps/*` and `packages/*` |
| `packages/shared-types` | ✅ Done | All enums, DTOs, WS event names, JWT types |
| `packages/geometry` | ✅ Done | AABB, 6 rotations, collision, support, CoG, volume |
| `packages/validation` | ✅ Done | Zod schemas + full server-side load validator |
| `packages/packing-engine` | ✅ Done | Greedy extreme-point 3D bin packing |
| `apps/api` — PrismaModule | ✅ Done | Global singleton with resilient retry loop for serverless DB |
| `apps/api` — AuthModule | ✅ Done | Argon2id + JWT + HTTP-only cookie refresh |
| `apps/api` — OrganizationModule | ✅ Done | GET /organization/me |
| `apps/api` — UserModule | ✅ Done | GET /users/me |
| `apps/api` — VehicleModule | ✅ Done | Full CRUD with role guards |
| `apps/api` — PackageDefinitionModule | ✅ Done | Full CRUD with search |
| `apps/api` — LoadModule | ✅ Done | CRUD + optimistic version locking + auto-pack + sequence |
| `apps/api` — LoadPackageService | ✅ Done | Add/remove packages, recalculate totals |
| `apps/api` — PlacementModule | ✅ Done | SELECT FOR UPDATE + collision validation |
| `apps/api` — LoadValidationModule | ✅ Done | Full load validation report |
| `apps/api` — HealthModule | ✅ Done | /health + /ready |
| `apps/api` — WebsocketModule | ✅ Done | Socket.IO gateway with JWT auth + rooms |
| `prisma/schema.prisma` | ✅ Done | 11 models, indexes, enums |
| `prisma/seed.ts` | ✅ Done | 3 vehicles, 8 package types, 3 users, 1 demo load |
| Database sync | ✅ Verified | Synced to dedicated PostgreSQL database via Neon |
| `prisma/seed.ts` | ✅ Verified | 3 vehicles, 8 package types, 3 users, 1 demo load seeded |
| `docker-compose.yml` | ✅ Done | postgres:16 + redis:7 |
| `.env` / `.env.example` | ✅ Done | All required vars documented |
| `README.md` | ✅ Done | Single source of truth |
| TypeScript compiles | ✅ Verified | `tsc --noEmit` passes with 0 errors |
| All packages build | ✅ Verified | `tsc` passes in all 4 packages |
| API running on localhost:3001 | ✅ Verified | /health, /auth/login, /loads, /validation tested & passing |

### ✅ Phase 2 — Next.js Frontend & 3D Visualization (COMPLETE)

| Item | Status | Notes |
|------|--------|-------|
| Next.js 14 App Router scaffold | ✅ Done | TypeScript, Tailwind, Lucide icons |
| Tailwind CSS + shadcn design system | ✅ Done | Apple-like aesthetics, clean cards, subtle shadows |
| Auth pages (login, register) | ✅ Done | `/login` and `/register` with validation |
| Auth state (Zustand + TanStack Query) | ✅ Done | Persistent JWT auth store and interceptors |
| Dashboard page | ✅ Done | `/dashboard` with KPI cards, quick actions, load summary |
| Vehicle management UI | ✅ Done | `/vehicles` list and specifications |
| Package definition management UI | ✅ Done | `/packages` catalog with SKU, dimensions, fragility |
| Load list page | ✅ Done | `/loads` table with status badges and metrics |
| Load detail / 3D Planner | ✅ Done | `/loads/[id]` with split 3D view, sidebars, metrics |
| 3D trailer scene (React Three Fiber) | ✅ Done | Realistic trailer wireframe, floor grid, lighting |
| Package boxes in 3D | ✅ Done | Dimensioned 3D boxes with status colors, rotation display |
| Camera presets & OrbitControls | ✅ Done | Isometric, Side, Top, and Rear door perspectives |
| Validation panel / warnings sidebar | ✅ Done | Real-time payload weight, door fit, collision flags |
| Weight distribution / CoG visualization | ✅ Done | Center of gravity marker & axle balance indicators |
| Mobile 2D fallback planner | ✅ Done | Top-down blueprint view for low-power/mobile devices |
| Responsive layout | ✅ Done | Desktop, tablet, and mobile-friendly collapsible views |

### ✅ Phase 3 — Auto-Pack Algorithm & Background Processing (COMPLETE)

| Item | Status | Notes |
|------|--------|-------|
| `apps/worker` scaffold | ✅ Done | Standalone worker process with BullMQ and Redis connection |
| Auto-pack job processor | ✅ Done | Extreme-point 3D packing engine integration |
| Auto-pack API endpoint | ✅ Done | `POST /api/loads/:id/auto-pack` with optimistic locking |
| Bulk placement persistence | ✅ Done | Optimized `createMany` batch transaction with 30s timeout |
| Real-time load metrics update | ✅ Done | Server recalculates weight/volume utilization & CoG |

### ✅ Phase 4 — Loading Sequence Simulation & Manifest Sheet (COMPLETE)

| Item | Status | Notes |
|------|--------|-------|
| Loading sequence generator API | ✅ Done | `GET /api/loads/:id/sequence` computes LIFO reverse sequence |
| 3D Interactive Sequence Player | ✅ Done | `SequencePlayer.tsx` with Play/Pause, Step Forward/Back, scrubber |
| 3D Simulation Stepper | ✅ Done | `TrailerScene` conditionally renders packages up to active step |
| Printable Load Manifest Sheet | ✅ Done | `/loads/[id]/manifest` with `@media print` clean formatting |
| Manifest details & Signatures | ✅ Done | Vehicle dimensions, item coordinates, driver & loader signoffs |

### ✅ Phase 5 — Collaboration, Undo/Redo & Advanced Testing (COMPLETE)

| Item | Status | Notes |
|------|--------|-------|
| Multi-user presence & active collaborators | ✅ Done | `CollaboratorPresence.tsx` with live avatar pills and active counts |
| Real-time WebSocket room sync | ✅ Done | Socket.IO gateway on `/ws`, presence tracking, placement broadcast |
| Client-side Undo/Redo history stack | ✅ Done | Integrated in `plannerStore` with hotkeys (`Ctrl+Z`, `Ctrl+Y`, `Ctrl+Shift+Z`) |
| Load audit log & revision timeline UI | ✅ Done | `GET /api/loads/:id/audit-logs` and `AuditHistoryModal.tsx` |
| Barcode & QR code scanning modal | ✅ Done | `BarcodeModal.tsx` with scalable SVG QR code and barcode copy/print |
| Geometry unit tests (Vitest) | ✅ Done | 14 tests for vector3, AABB, 6-axis rotations, CoG, containment |
| Packing engine unit tests (Vitest) | ✅ Done | 3 tests for single, multi-pallet, and oversized cargo packing |
| Validation unit tests (Vitest) | ✅ Done | 8 tests for Zod schemas, collision detection, floating cargo, payload limits |
| All workspace tests passing | ✅ Verified | 25/25 unit tests passing across all packages |

### ✅ Phase 6 — Multi-Stop Routing & LIFO Accessibility + Imperial/Metric Units (COMPLETE)

| Item | Status | Notes |
|------|--------|-------|
| LIFO Exit Path Accessibility Engine | ✅ Done | `packages/geometry/src/accessibility.ts` detects cargo blocking door exit path |
| Validation Integration | ✅ Done | `validateLoad` emits warnings if late-stop packages obstruct early deliveries |
| Accessibility Unit Tests | ✅ Done | 16 tests passing in `packages/geometry/test/geometry.spec.ts` |
| Metric & Imperial Units Engine | ✅ Done | `apps/web/src/lib/units.ts` supports mm ⟷ in/ft, kg ⟷ lbs, mm³ ⟷ ft³ |
| Persistent Units Zustand Store | ✅ Done | `settingsStore.ts` stores user unit preferences with localStorage persistence |
| Global Unit Switcher Navbar Toggle | ✅ Done | Seamless switch between Metric and Imperial in `AppNavbar.tsx` |
| Live Unit Formats in UI Components | ✅ Done | `CargoTray`, `ValidationPanel`, and `manifest` dynamically render chosen units |

### ✅ Phase 7 — Team Management, Production Dockerization & CI (COMPLETE)

| Item | Status | Notes |
|------|--------|-------|
| Team Member Management API | ✅ Done | GET/POST/PATCH/DELETE endpoints on `/organization/members` with `RolesGuard` |
| Team Management Dashboard UI | ✅ Done | `/team` route with members list, invite modal, role change, and member removal |
| Production Dockerfiles | ✅ Done | Multi-stage Dockerfiles for `apps/api`, `apps/web`, and `apps/worker` |
| Production Docker Compose | ✅ Done | `docker-compose.prod.yml` with healthchecks, environment configs, and networks |
| GitHub Actions CI Pipeline | ✅ Done | `.github/workflows/ci.yml` with lint, test across workspaces, and parallel builds |
| Full Stack API & Unit Tests | ✅ Verified | 31/31 unit & integration tests passing across all workspaces |
| Fine-Grained 3D Placement Controls | ✅ Done | 3D Nudge controls (X, Y, Z, snap to floor, rotation, unplace) in `CargoTray` |
| CSV & JSON Data Export | ✅ Done | 1-click machine-readable CSV & JSON manifest downloads in `manifest/page.tsx` |

### ✅ Phase 8 — High-Fidelity 3D Semi-Truck & Reference UI Design (COMPLETE)

| Item | Status | Notes |
|------|--------|-------|
| 3D Semi-Truck Tractor Cab | ✅ Done | `TruckCabin3D.tsx` high-gloss white aerodynamic cab, sleeper box, sloped hood, wraparound tinted windshield, side mirrors, dual tandem wheels with chrome rims, and fifth-wheel hitch coupling |
| 3D Trailer Chassis & Cutaway Showcase | ✅ Done | `TrailerChassis3D.tsx` heavy-duty steel I-beam rails, landing gear legs, aerodynamic side skirts, rear tandem dual-wheel axles, mudguards, rear bumper with tail lights, and cutaway frame |
| Interior Trailer Cargo Styling | ✅ Done | Off-white back wall with horizontal e-track aluminum cargo tie-down rails and floor guides |
| Photorealistic Cargo Cartons | ✅ Done | `Package3D.tsx` crisp off-white finish, printed dynamic weight (e.g. `500 kg`), routing tags (`B2R`, `2-NYK LDN`), fragile/hazardous warning banners |
| Reference Selection Indicator | ✅ Done | Exact 1:1 match with reference design: vivid purple border (`#7c3aed`) + central glowing purple badge/dot with white core |
| Reference KPI Bar | ✅ Done | `ReferenceKpiPills.tsx` displaying Weight (`7,340kg +33%`), Pallets (`120 +15%`), and Alerts (`62 -22%`) |
| Floating Glassmorphic Load Planning Card | ✅ Done | `LoadPlanningFloatingCard.tsx` with pallet item table, vehicle assignment, sequence numbers, quick filter, auto-pack, and clear plan |
| Horizontal Shipment Carousel | ✅ Done | `ShipmentCarousel.tsx` with 5 shipment cards and stylized truck silhouettes matching the reference design |
| Freight Units & Multi-Day Gantt Schedule | ✅ Done | `GanttFreightTimeline.tsx` with freight unit checkboxes, multi-day timeline, current-time vertical marker, and purple transit legs |
| Studio Lighting & Camera Controls | ✅ Done | Soft directional lighting, `<ContactShadows />` ground plane shadow, side-3/4 cinematic camera, and floating zoom/reset controls |

---

## 12. Phase Roadmap

### Phase 2: Next.js Frontend

**Start by creating `apps/web`:**

```powershell
npx create-next-app@latest apps/web --typescript --tailwind --app --src-dir --no-git
```

Then install additional dependencies:
```powershell
npm install --workspace=apps/web \
  @tanstack/react-query \
  zustand \
  react-hook-form \
  @hookform/resolvers \
  zod \
  socket.io-client \
  @react-three/fiber \
  @react-three/drei \
  three \
  @types/three \
  lucide-react \
  clsx \
  tailwind-merge \
  class-variance-authority
```

Install shadcn/ui:
```powershell
npx --workspace=apps/web shadcn@latest init
```

**Key files to create (in order):**
1. `apps/web/src/lib/api.ts` — Axios/fetch client with interceptors for token refresh
2. `apps/web/src/lib/queryClient.ts` — TanStack Query client config
3. `apps/web/src/store/authStore.ts` — Zustand store for access token
4. `apps/web/src/store/plannerStore.ts` — Zustand store for 3D scene state
5. `apps/web/src/app/layout.tsx` — Root layout with providers
6. `apps/web/src/app/(auth)/login/page.tsx` — Login page
7. `apps/web/src/app/(auth)/register/page.tsx` — Register page
8. `apps/web/src/app/(app)/dashboard/page.tsx` — Dashboard
9. `apps/web/src/app/(app)/loads/page.tsx` — Load list
10. `apps/web/src/app/(app)/loads/[id]/page.tsx` — Load planner (3D scene)
11. `apps/web/src/components/planner/TrailerScene.tsx` — React Three Fiber scene
12. `apps/web/src/components/planner/PackageBox.tsx` — 3D package mesh
13. `apps/web/src/components/planner/DragControls.tsx` — Drag-and-drop logic
14. `apps/web/src/hooks/useSocket.ts` — Socket.IO hook
15. `apps/web/src/hooks/useLoadRealtime.ts` — Real-time load state hook

**3D Scene Design:**
- Trailer: wireframe box using `<mesh>` with `<boxGeometry>` and `<MeshBasicMaterial wireframe />`
- Trailer floor: solid gray `<mesh>` with `<planeGeometry>`
- Trailer walls: semi-transparent materials
- Packages: `<Box>` from `@react-three/drei`, colored by category/status
- Selected package: outlined with `<Outlines>` from drei
- Camera: `<OrbitControls>` from drei, default to isometric-ish view
- Coordinate transform: Three.js X=right, Y=up, Z=toward-camera → map CargoFlow X→X, Y→Z, Z→Y
- Drag: use `@react-three/drei`'s `<DragControls>` or raycasting against the floor plane

### Phase 3: BullMQ Worker

Create `apps/worker/package.json` using BullMQ. The worker:
- Connects to Redis via `REDIS_URL`
- Connects to PostgreSQL via `DATABASE_URL` (Prisma)
- Processes `auto-pack` jobs
- Uses `packages/packing-engine` for computation
- Reports progress via Redis pub/sub → Socket.IO gateway emits to WS room

### Phase 4: Auto-Pack API Endpoint

Add to LoadModule:
```
POST /api/loads/:id/auto-pack
Body: { strategy: 'GREEDY' | 'BFD', loadVersion: number }

→ Enqueues a BullMQ job
→ Returns: { jobId, message: 'Packing started' }
→ Progress via WS: packing.progress events
→ Completion via WS: packing.completed with PackingResult
→ Backend saves placements to DB on completion
```

---

## 13. Coding Conventions

> ⚠️ **AI ASSISTANTS**: Follow these exactly. Do not introduce new patterns.

### TypeScript
- Strict mode enabled everywhere
- Prefer `interface` for object shapes, `type` for unions/intersections
- All async functions must handle errors (no silent catches)
- Never use `any` — use `unknown` and narrow, or create proper types

### NestJS (Backend)
- One module per feature area (AuthModule, LoadModule, etc.)
- Services contain business logic; controllers are thin (parse + delegate)
- Use `@CurrentUser()` decorator to get JWT payload, never trust body for user identity
- All input validated with Zod (not class-validator)
- All responses go through the `GlobalExceptionFilter`
- Use `PrismaService` (injected from PrismaModule) — never `new PrismaClient()`
- Guard order: `JwtAuthGuard` first, then `RolesGuard`

### React (Frontend — Phase 2)
- `use client` only where necessary (prefer server components)
- All API calls via TanStack Query (`useQuery`, `useMutation`)
- No direct `fetch` calls in components — use query hooks
- Zustand only for high-frequency UI state (3D drag positions, tool selection)
- Form state via React Hook Form + Zod resolver

### File Naming
- `kebab-case` for files and folders
- `PascalCase` for React components and classes
- `camelCase` for functions, variables, hooks
- Hooks start with `use` prefix
- Test files: `*.test.ts` or `*.spec.ts`

### Shared Types
- All types used across packages live in `packages/shared-types`
- Never duplicate type definitions between packages
- Always import from `@cargoflow/shared-types`, never from relative paths across packages

### Git
- Branch naming: `feature/`, `fix/`, `chore/` prefixes
- Commit message: `feat:`, `fix:`, `chore:`, `docs:` prefixes (Conventional Commits)
- Never commit `.env` — only `.env.example`

---

## 14. Environment Variables

All environment variables with descriptions:

```env
# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://cargoflow:cargoflow_dev@localhost:5432/cargoflow
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
# Docker Compose default: user=cargoflow, password=cargoflow_dev, db=cargoflow

# ── Redis ─────────────────────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379
# Used by: apps/api (Socket.IO Redis adapter in future), apps/worker (BullMQ)

# ── Auth ──────────────────────────────────────────────────────────────────────
JWT_SECRET=your-secret-at-least-32-characters-long
# Used to sign access tokens. Change in production. Min 32 chars.

# ── API Server ────────────────────────────────────────────────────────────────
PORT=3001
# Port for apps/api to listen on

WEB_URL=http://localhost:3000
# Used for CORS allow-origin and WebSocket CORS. Change in production.

NODE_ENV=development
# 'development' | 'production' | 'test'
# In production: secure cookies, stricter headers

# ── Frontend (Next.js) ────────────────────────────────────────────────────────
NEXT_PUBLIC_API_URL=http://localhost:3001/api
# Used by apps/web to call the API. Must be public (accessible from browser).

NEXT_PUBLIC_WS_URL=http://localhost:3001
# Used by apps/web for Socket.IO connection.
```

---

## 15. npm Scripts Reference

### Root level

```powershell
npm run dev:api          # Start NestJS API with hot reload
npm run dev:web          # Start Next.js frontend (Phase 2)
npm run dev:worker       # Start BullMQ worker (Phase 3)
npm run build            # Build all workspaces
npm run test             # Run all workspace unit tests
npm run test:e2e         # Run end-to-end multi-tenant platform flow test suite
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations (dev)
npm run prisma:studio    # Open Prisma Studio
npm run prisma:seed      # Run seed (requires ts-node)
```

### Individual workspaces

```powershell
npm run build --workspace=packages/shared-types
npm run build --workspace=packages/geometry
npm run build --workspace=packages/validation
npm run build --workspace=packages/packing-engine
npm run typecheck --workspace=apps/api
npm run build --workspace=apps/api
```

### Database (Docker required)

```powershell
docker compose up -d                                              # Start postgres + redis
docker compose down                                               # Stop
docker compose ps                                                 # Status
npx prisma migrate dev --schema=prisma/schema.prisma             # Run migrations
npx prisma migrate reset --schema=prisma/schema.prisma           # Reset DB (⚠️ deletes data)
npx ts-node --project prisma/tsconfig.json prisma/seed.ts        # Seed demo data
npx prisma studio --schema=prisma/schema.prisma                  # Visual DB browser
```

---

*This README is maintained as the living specification for CargoFlow. Update the Development Status section after completing each task.*

# CargoFlow System Architecture 🚛

## 1. Overview & High-Level Topology

CargoFlow is an enterprise SaaS platform engineered for 3D trailer and truck cargo load planning, real-time multi-user collaboration, automated spatial optimization, and warehouse loading sequence generation.

```
                              ┌─────────────────────────────────────────┐
                              │            Client Layer                 │
                              │ Next.js 14 App Router (R3F Three.js)    │
                              └────────────────────┬────────────────────┘
                                                   │
                                     HTTPS / WSS   │
                                                   ▼
                              ┌─────────────────────────────────────────┐
                              │             Gateway / API               │
                              │   NestJS Monolith (Port 3001)           │
                              │   - RESTful API                         │
                              │   - Socket.IO Gateway (/ws)             │
                              │   - RolesGuard & JWT Auth               │
                              └───────┬─────────────────────────┬───────┘
                                      │                         │
                                      ▼                         ▼
                      ┌──────────────────────┐    ┌──────────────────────┐
                      │    PostgreSQL 16     │    │       Redis 7        │
                      │  Prisma ORM (Neon)   │    │ BullMQ Job Broker    │
                      └──────────────────────┘    └──────────┬───────────┘
                                                             │
                                                             ▼
                                                  ┌──────────────────────┐
                                                  │   Background Worker  │
                                                  │ BullMQ Worker Node   │
                                                  │ 3D Packing Engine    │
                                                  └──────────────────────┘
```

---

## 2. Monorepo Structure

CargoFlow uses an npm workspaces monorepo:

- **`apps/web`**: Next.js 14 frontend using React Three Fiber, Three.js, Zustand, TanStack Query, and Tailwind CSS.
- **`apps/api`**: Authoritative NestJS backend providing REST endpoints, WebSocket collaboration gateway, and database persistence.
- **`apps/worker`**: BullMQ distributed worker for heavy 3D spatial optimization tasks.
- **`packages/shared-types`**: Single source of truth for DTOs, Enums, WebSocket event names, and geometry interfaces.
- **`packages/geometry`**: Standalone 3D math engine: Vector3, AABB collisions, 6-axis rotations, Center of Gravity, base support, and LIFO accessibility raycasting.
- **`packages/validation`**: Authoritative Zod schemas and server-side placement and load constraint validator.
- **`packages/packing-engine`**: Extreme-point greedy 3D bin packing algorithm.
- **`packages/ui`**: Shared design system components (`Button`, `Card`, `Badge`, `KpiCard`).

---

## 3. Coordinate System & 3D Math

### Coordinate Orientation
CargoFlow uses a canonical millimeter ($mm$) coordinate system inside the trailer:
- **Origin $(0,0,0)$**: Front-left-bottom interior corner of the trailer cargo bay.
- **$X$-Axis**: Trailer Length (directed from Front Wall $X=0$ toward Rear Door $X=L$).
- **$Y$-Axis**: Trailer Width (directed from Left Wall $Y=0$ toward Right Wall $Y=W$).
- **$Z$-Axis**: Elevation / Height (directed from Floor $Z=0$ toward Ceiling $Z=H$).

### Three.js Scene Mapping
Three.js uses a $Y$-up coordinate system:
$$\text{Three.js } X = \text{CargoFlow } X / 1000$$
$$\text{Three.js } Y = \text{CargoFlow } Z / 1000 \quad (\text{Elevation})$$
$$\text{Three.js } Z = \text{CargoFlow } Y / 1000 \quad (\text{Lateral})$$

### 6-Axis Box Rotations
Boxes can be placed in one of 6 orthogonal axis-aligned orientations:
- Index 0: $[L, W, H]$ (Original)
- Index 1: $[L, H, W]$ ($90^\circ$ around $X$)
- Index 2: $[W, L, H]$ ($90^\circ$ around $Z$)
- Index 3: $[W, H, L]$ ($90^\circ$ around $Z$ + $90^\circ$ around $X$)
- Index 4: $[H, L, W]$ ($90^\circ$ around $Y$)
- Index 5: $[H, W, L]$ ($90^\circ$ around $Y$ + $90^\circ$ around $Z$)

---

## 4. Multi-Tenant Architecture & Security

- **Organization Scoping**: All vehicles, packages, loads, placements, and audit logs include `organizationId`.
- **Row-Level Tenant Isolation**: All database queries strictly scope with `where: { organizationId: currentUser.orgId }`.
- **Role-Based Access Control**:
  - `SUPER_ADMIN`: Cross-tenant administration
  - `ORG_ADMIN`: Organization settings, vehicle & team management
  - `PLANNER`: Create and edit loads, packages, placements, and packing
  - `DISPATCHER`: Assign drivers, change route statuses
  - `LOADER`: View loading sequences, mark items loaded via barcode
  - `DRIVER`: View assigned delivery manifest and navigation order
  - `VIEWER`: Read-only access

---

## 5. Concurrency & Real-Time Sync

### Pessimistic Concurrency Locking
To prevent simultaneous race conditions when multiple dispatchers place items:
1. Every load has an incrementing integer `version`.
2. When creating, moving, or removing placements, a PostgreSQL transaction performs:
   ```sql
   SELECT id, version FROM "Load" WHERE id = $loadId FOR UPDATE;
   ```
3. If the client's `loadVersion` does not match the database version, an `ErrorCode.LOAD_CONFLICT` is returned, prompting client reconciliation.
4. On success, `version` is incremented and the change is broadcast via Socket.IO room `load:${loadId}`.


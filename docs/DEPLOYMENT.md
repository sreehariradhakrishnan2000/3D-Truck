# CargoFlow Production Deployment Guide 🚀

## 1. Quick Start with Production Docker Compose

CargoFlow includes a production-ready multi-container configuration in `docker-compose.prod.yml`.

### Prerequisites
- Docker Engine 24+ & Docker Compose v2+
- A valid PostgreSQL database (or use internal PostgreSQL container)
- Redis 7+ instance

### Launching the Full Stack
```bash
# 1. Clone repository
git clone https://github.com/sreehariradhakrishnan2000/3D-Truck.git
cd 3D-Truck

# 2. Configure environment variables
cp .env.example .env
# Edit .env and supply a strong JWT_SECRET and DATABASE_URL

# 3. Build and run in detached mode
docker compose -f docker-compose.prod.yml up --build -d
```

### Containers Started:
- **`cargoflow-api`**: NestJS Authoritative backend listening on port `3001`
- **`cargoflow-web`**: Next.js 14 Standalone Production Runner listening on port `3000`
- **`cargoflow-worker`**: BullMQ 3D Auto-Pack Background Worker
- **`cargoflow-postgres`**: PostgreSQL 16 database on port `5432`
- **`cargoflow-redis`**: Redis 7 cache & message broker on port `6379`

---

## 2. Cloud Deployment (AWS ECS / GCP Cloud Run / Kubernetes)

### Independent Service Scaling
CargoFlow is architected with decoupled services:
1. **Web Frontend (`apps/web`)**: Stateless Next.js container. Can be deployed to AWS ECS, GCP Cloud Run, or Vercel.
2. **API Backend (`apps/api`)**: Horizontally scalable NestJS container. Handles stateless REST and stateful Socket.IO connections. When running multiple API replicas, enable Redis adapter for Socket.IO.
3. **Background Worker (`apps/worker`)**: Compute-optimized container. Scale worker replicas based on queue depth in BullMQ.
4. **Database (PostgreSQL)**: Use managed PostgreSQL (e.g. AWS Aurora, GCP Cloud SQL, or Neon) with connection pooling enabled.

---

## 3. Production Environment Variables Reference

```env
# Database
DATABASE_URL=postgresql://user:password@db-host:5432/cargoflow?sslmode=require

# Redis & BullMQ
REDIS_URL=redis://redis-host:6379

# Security
JWT_SECRET=super-secret-production-key-at-least-32-chars
NODE_ENV=production

# URLs
PORT=3001
WEB_URL=https://app.yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
NEXT_PUBLIC_WS_URL=https://api.yourdomain.com
```


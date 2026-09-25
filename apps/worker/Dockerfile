# ============================================================
# Stage 1: Build
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY tsconfig.json ./

COPY packages ./packages
COPY prisma ./prisma
COPY apps/worker ./apps/worker

RUN npm ci
RUN npx prisma generate

RUN npm run build --workspace=@cargoflow/shared-types
RUN npm run build --workspace=@cargoflow/geometry
RUN npm run build --workspace=@cargoflow/packing-engine
RUN npm run build --workspace=apps/worker

# ============================================================
# Stage 2: Production Runner
# ============================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/apps/worker/package.json ./apps/worker/package.json

CMD ["node", "apps/worker/dist/index.js"]


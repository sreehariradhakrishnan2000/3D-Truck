# ============================================================
# Stage 1: Build
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace configurations
COPY package.json package-lock.json ./
COPY tsconfig.json ./

# Copy packages
COPY packages ./packages

# Copy Prisma schema
COPY prisma ./prisma

# Copy API app
COPY apps/api ./apps/api

# Install all dependencies and build
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Build packages and API
RUN npm run build --workspace=@cargoflow/shared-types
RUN npm run build --workspace=@cargoflow/geometry
RUN npm run build --workspace=@cargoflow/validation
RUN npm run build --workspace=@cargoflow/packing-engine
RUN npm run build --workspace=@cargoflow/api

# ============================================================
# Stage 2: Production Runner
# ============================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy built node_modules and artifacts
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

CMD ["node", "apps/api/dist/main"]

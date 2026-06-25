# Multi-stage build
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Install system dependencies for node-canvas, sqlite, sharp, and tesseract
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

FROM base AS dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm config set dangerouslyAllowAllBuilds true
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
# Run prisma generate before building Next.js
RUN pnpm prisma generate
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Create storage directory for uploads and SQLite database
RUN mkdir -p /app/storage

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/src/lib/cv-worker.mjs ./src/lib/cv-worker.mjs
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/ara.traineddata ./ara.traineddata
COPY --from=builder /app/eng.traineddata ./eng.traineddata

# Environment Defaults for Production Container
ENV DATABASE_URL="file:/app/storage/prod.db"
ENV STORAGE_ROOT="/app/storage"
ENV PORT=3000

# Mount a persistent volume on /app/storage when deploying
VOLUME ["/app/storage"]

EXPOSE 3000
CMD pnpm prisma migrate deploy && pnpm start
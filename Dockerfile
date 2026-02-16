# Use the official Node.js runtime as the base image
# Using Alpine Linux with OpenSSL 3.x for Prisma compatibility
ARG CACHE_BUST=1
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache \
    openssl \
    ca-certificates \
    wget \
    libc6-compat \
    postgresql-client \
    libstdc++ \
    python3 \
    make \
    g++

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies with optimized settings for low memory
RUN npm ci --include=dev --prefer-offline --no-audit --no-fund

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
ENV PRISMA_HIDE_UPDATE_MESSAGE=true
RUN npx prisma generate

# Build the application with optimized memory limit for 8GB VPS
ENV NODE_OPTIONS="--max-old-space-size=2048"
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV CI=true
ENV TURBOPACK=0
RUN npm run build 2>&1 | tail -100

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Install required libraries for Prisma and postgresql client for seeding
RUN apk add --no-cache \
    openssl \
    ca-certificates \
    wget \
    libc6-compat \
    postgresql-client \
    libstdc++

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set the correct permission for prerender cache
RUN mkdir -p .next && chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy Prisma files
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy startup script and fallback seed
COPY --from=builder /app/startup.sh ./startup.sh
COPY --from=builder /app/seed-fallback.sql ./seed-fallback.sql
RUN chmod +x ./startup.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
# set hostname to localhost
ENV HOSTNAME="0.0.0.0"

# Use the startup script as the entrypoint
CMD ["./startup.sh"]

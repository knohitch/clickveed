# Minimal multi-stage build for low-memory environments
FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline --no-audit --no-fund --omit=optional --cache /tmp/.npm

# Build stage
FROM base AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_DISABLE_SWC_WORKER=1
ENV NEXT_PRIVATE_BUILD_WORKER=0

# Generate Prisma client for Alpine only (linux-musl)
ENV PRISMA_CLI_BINARY_TARGETS="linux-musl-openssl-3.0.x"
RUN ./node_modules/.bin/prisma generate

# Build with aggressive memory reduction to avoid OOM segfaults
RUN echo "Build attempt 1: 1024MB" && \
    NODE_OPTIONS="--max-old-space-size=1024" node_modules/.bin/next build --no-lint 2>&1 || \
    (echo "Build attempt 2: 512MB" && \
    NODE_OPTIONS="--max-old-space-size=512" node_modules/.bin/next build --no-lint 2>&1) || \
    (echo "Build attempt 3: 256MB" && \
    NODE_OPTIONS="--max-old-space-size=256" node_modules/.bin/next build --no-lint 2>&1) || \
    (echo "ERROR: All build attempts failed" && exit 1)
RUN echo "Verifying .next directory exists..." && \
    test -d /app/.next || (echo "ERROR: .next not found after build. Build may have failed due to OOM or other error." && exit 1)

# Production stage
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install OpenSSL and libc6-compat for Prisma engine
RUN apk add --no-cache openssl libc6-compat

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN mkdir -p .next && chown nextjs:nodejs .next

# Use standalone output (minimal size - only what Next.js needs)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/startup.sh ./startup.sh
RUN chmod +x ./startup.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["./startup.sh"]

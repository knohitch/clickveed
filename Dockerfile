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
    libstdc++

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies - use npm ci with --include=dev for build dependencies
RUN npm ci --include=dev

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application with increased memory limit
ENV NODE_OPTIONS="--max-old-space-size=6144"
RUN npm run build

# BUILD ASSERTION: Verify public directory exists after build
RUN ls -la /app/public && echo "Public directory exists at /app/public" || (echo "ERROR: Public directory missing at /app/public" && exit 1)

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

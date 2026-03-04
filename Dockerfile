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

ENV NODE_OPTIONS="--max-old-space-size=1536"
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_DISABLE_SWC_WORKER=1
ENV NEXT_PRIVATE_BUILD_WORKER=0

# Generate Prisma client for Alpine only (linux-musl)
ENV PRISMA_CLI_BINARY_TARGETS="linux-musl-openssl-3.0.x"
RUN ./node_modules/.bin/prisma generate

# Build with minimal output
RUN npm run build:docker -- --no-lint 2>&1 | tee /tmp/build.log || (echo "Docker build failed. Dumping /tmp/build.log" && cat /tmp/build.log && exit 1)

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

# Copy full Next build output and runtime deps to avoid hard dependency on standalone output.
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/startup.sh ./startup.sh
RUN chmod +x ./startup.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["./startup.sh"]

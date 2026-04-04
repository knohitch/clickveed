# syntax=docker/dockerfile:1.7
FROM node:20-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    openssl \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --no-fund

FROM base AS builder
ARG BUILD_MAX_OLD_SPACE_SIZE=3072
ARG NEXT_DISABLE_SWC_WORKER=1
ARG NEXT_PRIVATE_BUILD_WORKER=0

ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=${BUILD_MAX_OLD_SPACE_SIZE}
ENV NEXT_DISABLE_SWC_WORKER=${NEXT_DISABLE_SWC_WORKER}
ENV NEXT_PRIVATE_BUILD_WORKER=${NEXT_PRIVATE_BUILD_WORKER}
ENV PRISMA_CLI_BINARY_TARGETS=debian-openssl-3.0.x

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN ./node_modules/.bin/prisma generate
RUN ./node_modules/.bin/next build || \
    (echo "Retrying build with stricter memory settings..." && \
     NODE_OPTIONS=--max-old-space-size=2560 NEXT_DISABLE_SWC_WORKER=1 NEXT_PRIVATE_BUILD_WORKER=0 ./node_modules/.bin/next build)
RUN test -f /app/.next/standalone/server.js

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    openssl \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid 1001 --create-home nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/startup.sh ./startup.sh

RUN chmod +x ./startup.sh

USER nextjs
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["./startup.sh"]

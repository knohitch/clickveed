# syntax=docker/dockerfile:1.7
FROM node:18-alpine AS base

WORKDIR /app

FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --no-fund --omit=optional

FROM base AS builder
RUN apk add --no-cache libc6-compat openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG BUILD_MAX_OLD_SPACE_SIZE=4608
ARG NEXT_DISABLE_SWC_WORKER=1
ARG NEXT_PRIVATE_BUILD_WORKER=0

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=${BUILD_MAX_OLD_SPACE_SIZE}
ENV NEXT_DISABLE_SWC_WORKER=${NEXT_DISABLE_SWC_WORKER}
ENV NEXT_PRIVATE_BUILD_WORKER=${NEXT_PRIVATE_BUILD_WORKER}

ENV PRISMA_CLI_BINARY_TARGETS="linux-musl-openssl-3.0.x"
RUN ./node_modules/.bin/prisma generate

RUN npm run build:docker
RUN test -f /app/.next/BUILD_ID

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache openssl libc6-compat

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN mkdir -p .next && chown nextjs:nodejs .next

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

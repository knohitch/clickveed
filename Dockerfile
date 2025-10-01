# Use the official Node.js runtime as the base image
# Using Alpine Linux with OpenSSL 1.1 compatibility for Prisma
ARG CACHE_BUST=1
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Install OpenSSL and other required libraries
RUN apk add --no-cache \
    openssl \
    ca-certificates \
    wget \
    libc6-compat \
    postgresql-client

# Install OpenSSL 1.1 from Alpine's v3.15 repository and update library cache
RUN apk add --no-cache --repository http://dl-cdn.alpinelinux.org/alpine/v3.15/main \
    libssl1.1 && \
    ldconfig /usr/lib:/lib

# Set library paths for Prisma
ENV LD_LIBRARY_PATH=/usr/lib:/lib

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
# Install all dependencies including devDependencies for build process
# Use npm install instead of npm ci to ensure devDependencies are installed
RUN npm install

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Install OpenSSL 1.1 from Alpine's v3.15 repository and update library cache
RUN apk add --no-cache --repository http://dl-cdn.alpinelinux.org/alpine/v3.15/main \
    libssl1.1 && \
    ldconfig /usr/lib:/lib

# Set library paths for Prisma
ENV LD_LIBRARY_PATH=/usr/lib:/lib

# Generate Prisma client with Alpine-specific binary target
RUN npx prisma generate

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Install required SSL libraries for Prisma and postgresql client for seeding
RUN apk add --no-cache \
    openssl \
    ca-certificates \
    wget \
    libc6-compat \
    postgresql-client

# Install OpenSSL 1.1 from Alpine's v3.15 repository and update library cache
RUN apk add --no-cache --repository http://dl-cdn.alpinelinux.org/alpine/v3.15/main \
    libssl1.1 && \
    ldconfig /usr/lib:/lib

# Verify OpenSSL 1.1 installation and library availability
RUN ls -la /usr/lib/libssl.so* && \
    ls -la /usr/lib/libcrypto.so* && \
    openssl version -a

# Set library paths for Prisma
ENV LD_LIBRARY_PATH=/usr/lib:/lib

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public directory if it exists, otherwise create an empty one
RUN mkdir -p ./public
RUN cp -r /app/public/* ./public/ 2>/dev/null || true

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

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

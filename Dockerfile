# Use the official Node.js runtime as the base image
ARG CACHE_BUST=1
FROM node:18-slim AS base

# Install dependencies only when needed
FROM base AS deps
# Install OpenSSL and other required libraries
# Note: Debian Bookworm uses OpenSSL 3.x, but Prisma specifically needs OpenSSL 1.1
# We'll install both OpenSSL 1.1 and 3.x for compatibility
RUN apt-get update && apt-get install -y \
    openssl \
    libssl3 \
    libc6 \
    ca-certificates \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Download and install OpenSSL 1.1 for Prisma compatibility
RUN wget http://archive.debian.org/debian/pool/main/o/openssl/libssl1.1_1.1.1w-0+deb11u1_amd64.deb && \
    dpkg -i libssl1.1_1.1.1w-0+deb11u1_amd64.deb && \
    rm libssl1.1_1.1.1w-0+deb11u1_amd64.deb
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

# Generate Prisma client with Debian-specific binary target
RUN npx prisma generate

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Install required SSL libraries for Prisma and postgresql client for seeding
# Note: Prisma specifically needs OpenSSL 1.1, so we install both versions
RUN apt-get update && apt-get install -y \
    openssl \
    libssl3 \
    postgresql-client \
    ca-certificates \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Download and install OpenSSL 1.1 for Prisma compatibility
RUN wget http://archive.debian.org/debian/pool/main/o/openssl/libssl1.1_1.1.1w-0+deb11u1_amd64.deb && \
    dpkg -i libssl1.1_1.1.1w-0+deb11u1_amd64.deb && \
    rm libssl1.1_1.1.1w-0+deb11u1_amd64.deb

# Verify OpenSSL 1.1 installation
RUN ls -la /usr/lib/x86_64-linux-gnu/libssl.so* && \
    ls -la /usr/lib/x86_64-linux-gnu/libcrypto.so* && \
    openssl version -a

ENV NODE_ENV production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED 1

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

ENV PORT 3000
# set hostname to localhost
ENV HOSTNAME "0.0.0.0"

# Use the startup script as the entrypoint
CMD ["./startup.sh"]

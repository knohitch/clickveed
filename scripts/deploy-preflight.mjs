import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import AWS from 'aws-sdk';
import { PrismaClient } from '@prisma/client';

function loadEnvFiles() {
  const root = process.cwd();
  const candidates = ['.env.production.local', '.env.production', '.env.local', '.env'];

  for (const file of candidates) {
    const absolutePath = path.join(root, file);
    if (fs.existsSync(absolutePath)) {
      dotenv.config({ path: absolutePath, override: false });
    }
  }
}

function getEnvValue(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return '';
}

function normalizeEndpointHost(endpoint) {
  return endpoint.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

async function withTimeout(promise, timeoutMs, timeoutMessage) {
  let timeoutHandle = null;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

function logCheck(result) {
  const prefix = result.status === 'pass' ? '[PASS]' : result.status === 'warn' ? '[WARN]' : '[FAIL]';
  console.log(`${prefix} ${result.name}: ${result.message}`);
}

async function run() {
  loadEnvFiles();
  console.log('Running production deploy preflight checks...');
  const results = [];

  const authSecret = getEnvValue('AUTH_SECRET', 'NEXTAUTH_SECRET');
  if (!authSecret) {
    results.push({
      name: 'Auth Secret',
      status: 'fail',
      message: 'Missing AUTH_SECRET/NEXTAUTH_SECRET.',
    });
  } else {
    results.push({
      name: 'Auth Secret',
      status: 'pass',
      message: 'AUTH secret is configured.',
    });
  }

  const publicSiteUrl = getEnvValue('NEXT_PUBLIC_SITE_URL', 'NEXTAUTH_URL', 'AUTH_URL');
  if (!publicSiteUrl) {
    results.push({
      name: 'Public URL',
      status: 'fail',
      message: 'Missing NEXT_PUBLIC_SITE_URL/NEXTAUTH_URL/AUTH_URL.',
    });
  } else {
    results.push({
      name: 'Public URL',
      status: 'pass',
      message: publicSiteUrl,
    });
  }

  try {
    const sharpModule = await import('sharp');
    const sharpAny = sharpModule;
    const sharpVersion =
      sharpAny?.default?.versions?.sharp ||
      sharpAny?.versions?.sharp ||
      'installed';
    results.push({
      name: 'Sharp Runtime',
      status: 'pass',
      message: `sharp ${sharpVersion}`,
    });
  } catch (error) {
    results.push({
      name: 'Sharp Runtime',
      status: 'fail',
      message: `Sharp import failed: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  const databaseUrl = getEnvValue('DATABASE_URL');
  if (!databaseUrl) {
    results.push({
      name: 'Database URL',
      status: 'fail',
      message: 'Missing DATABASE_URL.',
    });
  } else {
    const prisma = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
      log: ['error'],
      errorFormat: 'minimal',
    });

    try {
      await withTimeout(prisma.$connect(), 10000, 'Prisma connect timed out after 10s');
      await withTimeout(prisma.$queryRaw`SELECT 1`, 10000, 'Prisma SELECT 1 timed out after 10s');
      results.push({
        name: 'Database Connectivity',
        status: 'pass',
        message: 'Prisma connected and query succeeded.',
      });
    } catch (error) {
      results.push({
        name: 'Database Connectivity',
        status: 'fail',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      await prisma.$disconnect().catch(() => {});
    }
  }

  const wasabiEndpoint = getEnvValue('WASABI_ENDPOINT');
  const wasabiRegion = getEnvValue('WASABI_REGION');
  const wasabiBucket = getEnvValue('WASABI_BUCKET');
  const wasabiAccessKey = getEnvValue('WASABI_ACCESS_KEY_ID', 'WASABI_ACCESS_KEY');
  const wasabiSecretKey = getEnvValue('WASABI_SECRET_ACCESS_KEY', 'WASABI_SECRET_KEY');

  const storageValues = [wasabiEndpoint, wasabiRegion, wasabiBucket, wasabiAccessKey, wasabiSecretKey];
  const hasAnyStorage = storageValues.some(Boolean);
  const hasAllStorage = storageValues.every(Boolean);

  if (!hasAnyStorage) {
    results.push({
      name: 'Storage Configuration',
      status: 'warn',
      message: 'Wasabi env vars are not set in this shell (skipping active storage probe).',
    });
  } else if (!hasAllStorage) {
    results.push({
      name: 'Storage Configuration',
      status: 'fail',
      message: 'Wasabi env vars are partially configured. Set endpoint, region, bucket, and both access keys.',
    });
  } else {
    const s3 = new AWS.S3({
      endpoint: `https://${normalizeEndpointHost(wasabiEndpoint)}`,
      region: wasabiRegion,
      credentials: {
        accessKeyId: wasabiAccessKey,
        secretAccessKey: wasabiSecretKey,
      },
      s3ForcePathStyle: true,
      signatureVersion: 'v4',
    });

    try {
      await withTimeout(
        s3.headBucket({ Bucket: wasabiBucket }).promise(),
        10000,
        'Wasabi headBucket timed out after 10s'
      );
      results.push({
        name: 'Storage Connectivity',
        status: 'pass',
        message: `Connected to bucket ${wasabiBucket}.`,
      });
    } catch (error) {
      results.push({
        name: 'Storage Connectivity',
        status: 'fail',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const result of results) {
    logCheck(result);
  }

  const failed = results.filter((result) => result.status === 'fail').length;
  const warned = results.filter((result) => result.status === 'warn').length;
  console.log(`Preflight summary: ${results.length} checks, ${failed} failed, ${warned} warnings.`);

  return failed > 0 ? 1 : 0;
}

run()
  .then((code) => {
    process.exit(code);
  })
  .catch((error) => {
    console.error('[FAIL] Preflight crashed:', error);
    process.exit(1);
  });

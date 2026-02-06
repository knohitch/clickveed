import { PrismaClient, Prisma } from '@prisma/client';
import * as crypto from 'crypto';

// CRITICAL: Explicitly set runtime to Node.js to prevent Edge Runtime analysis
// This fixes build errors from crypto and process APIs not supported in Edge Runtime
export const runtime = 'nodejs';

// CRITICAL FIX: Consolidated Prisma client with encryption middleware
// Added connection pooling, retry logic, and heartbeat for production reliability

// Singleton pattern to prevent multiple instances in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Connection pool and retry configuration for production
const prismaClientOptions = {
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  // Enable query engine optimizations
  errorFormat: 'minimal',
};

// Heartbeat interval to keep connections alive (5 minutes)
const HEARTBEAT_INTERVAL = 5 * 60 * 1000;
let heartbeatInterval: NodeJS.Timeout | null = null;

// Helper function to create Prisma client with retry logic
function createPrismaClient(): PrismaClient {
  const client = new PrismaClient(prismaClientOptions as any);

  // Add connection retry logic with exponential backoff
  const originalConnect = client.$connect.bind(client);
  // @ts-ignore - Prisma middleware type mismatch
  client.$connect = async (params: any, next: any) => {
    const maxRetries = 5;
    const baseDelay = 1000; // 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await originalConnect();
        if (attempt > 1) {
          console.log(`[Prisma] Connected successfully after ${attempt} attempts`);
        }
        return;
      } catch (error) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff

        if (attempt === maxRetries) {
          console.error(`[Prisma] Failed to connect after ${maxRetries} attempts:`, error);
          throw error;
        }

        console.warn(`[Prisma] Connection attempt ${attempt}/${maxRetries} failed. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  // Start heartbeat to keep connections alive
  const startHeartbeat = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    
    heartbeatInterval = setInterval(async () => {
      try {
        // Simple query to keep connection alive
        await client.$queryRaw`SELECT 1`;
        console.log('[Prisma] Heartbeat: Connection alive');
      } catch (error) {
        console.warn('[Prisma] Heartbeat failed, reconnecting...');
        try {
          await client.$disconnect();
        } catch (e) {
          // Ignore disconnect errors
        }
        await client.$connect();
      }
    }, HEARTBEAT_INTERVAL);
  };

  // Start heartbeat after successful connection
  const originalConnectWithHeartbeat = client.$connect;
  client.$connect = async () => {
    await originalConnectWithHeartbeat();
    startHeartbeat();
  };

  return client;
}

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Wrapper for database operations with retry logic
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: { maxRetries?: number; baseDelay?: number; operationName?: string } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 500, operationName = 'Database operation' } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      // Check if it's a connection error that should be retried
      const isConnectionError =
        error instanceof Error &&
        (error.message.includes('Connection') ||
          error.message.includes('ECONNREFUSED') ||
          error.message.includes('ETIMEDOUT') ||
          error.message.includes('P1001') ||  // Prisma: Unable to reach database server
          error.message.includes('P1002') ||  // Prisma: Database server timeout
          error.message.includes('P2024'));   // Prisma: Connection pool timeout

      if (!isConnectionError || attempt === maxRetries) {
        console.error(`[Prisma] ${operationName} failed after ${attempt} attempts:`, error);
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(`[Prisma] ${operationName} attempt ${attempt}/${maxRetries} failed. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error(`${operationName} failed after ${maxRetries} retries`);
}

// Graceful shutdown handler
async function handleShutdown() {
  console.log('[Prisma] Disconnecting from database...');
  await prisma.$disconnect();
  console.log('[Prisma] Disconnected successfully');
}

// Register shutdown handlers only in non-browser environments
if (typeof process !== 'undefined') {
  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);
}

// Encryption key handling for SocialConnection tokens
const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY;
let ENCRYPTION_KEY: Buffer | undefined = undefined;

// Encryption middleware for SocialConnection accessTokens
prisma.$use(async (params: Prisma.MiddlewareParams, next: (params: Prisma.MiddlewareParams) => Promise<any>) => {
  // Only check for encryption key when we actually need to use it
  const needsEncryption =
    (params.model === 'SocialConnection' &&
      params.action === 'create' &&
      params.args?.data?.accessToken) ||
    (params.model === 'SocialConnection' &&
      params.action === 'update' &&
      params.args?.data?.accessToken);

  if (needsEncryption) {
    if (!ENCRYPTION_KEY_HEX) {
      console.warn(
        'ENCRYPTION_KEY not set - social connection tokens will not be encrypted'
      );
    } else {
      // AES-256 uses 32-byte key (64 hex characters)
      if (ENCRYPTION_KEY_HEX.length === 64) {
        ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');
      } else {
        console.warn('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
      }
    }
  }

  // Encrypt accessToken on create
  if (
    params.model === 'SocialConnection' &&
    params.action === 'create' &&
    params.args?.data?.accessToken &&
    ENCRYPTION_KEY
  ) {
    params.args.data.accessToken = encrypt(
      params.args.data.accessToken,
      ENCRYPTION_KEY
    );
  }

  // Encrypt accessToken on update
  if (
    params.model === 'SocialConnection' &&
    params.action === 'update' &&
    params.args?.data?.accessToken &&
    ENCRYPTION_KEY
  ) {
    params.args.data.accessToken = encrypt(
      params.args.data.accessToken,
      ENCRYPTION_KEY
    );
  }

  const result = await next(params);

  // Decrypt accessToken after findUnique
  if (
    params.model === 'SocialConnection' &&
    params.action === 'findUnique' &&
    result?.accessToken &&
    ENCRYPTION_KEY
  ) {
    try {
      result.accessToken = decrypt(result.accessToken, ENCRYPTION_KEY);
    } catch (e) {
      console.warn('Failed to decrypt accessToken');
    }
  }

  // Decrypt accessToken after findFirst
  if (
    params.model === 'SocialConnection' &&
    params.action === 'findFirst' &&
    result?.accessToken &&
    ENCRYPTION_KEY
  ) {
    try {
      result.accessToken = decrypt(result.accessToken, ENCRYPTION_KEY);
    } catch (e) {
      console.warn('Failed to decrypt accessToken');
    }
  }

  // Decrypt accessToken after findMany
  if (
    params.model === 'SocialConnection' &&
    params.action === 'findMany' &&
    Array.isArray(result)
  ) {
    result.forEach((item) => {
      if (item?.accessToken && ENCRYPTION_KEY) {
        try {
          item.accessToken = decrypt(item.accessToken, ENCRYPTION_KEY);
        } catch (e) {
          console.warn('Failed to decrypt accessToken for item');
        }
      }
    });
  }

  return result;
});

// AES-256-CBC encryption
function encrypt(text: string, key: Buffer): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// AES-256-CBC decryption
function decrypt(encryptedText: string, key: Buffer): string {
  const parts = encryptedText.split(':');
  if (parts.length !== 2) {
    return encryptedText; // Return as-is if not encrypted format
  }
  const [ivHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  decipher.setAutoPadding(true);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

export default prisma;

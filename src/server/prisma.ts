import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

// CRITICAL FIX: Consolidated Prisma client with encryption middleware
// Removed Prisma Accelerate as it requires special configuration and setup

// Singleton pattern to prevent multiple instances in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Encryption key handling for SocialConnection tokens
const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY;
let ENCRYPTION_KEY: Buffer | undefined = undefined;

// Encryption middleware for SocialConnection accessTokens
prisma.$use(async (params, next) => {
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

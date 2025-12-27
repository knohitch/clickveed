import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Fix Bug #2: Validate ENCRYPTION_KEY exists before using it
// Only validate when actually using the key (lazy validation) to avoid build-time errors
const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY;
let ENCRYPTION_KEY: Buffer | undefined = undefined;

prisma.$use(async (params, next) => {
  // Only check for encryption key when we actually need to use it
  const needsEncryption = 
    (params.model === 'SocialConnection' && params.action === 'create' && params.args.data.accessToken) ||
    (params.model === 'SocialConnection' && params.action === 'update' && params.args.data.accessToken);  
  if (needsEncryption) {
    if (!ENCRYPTION_KEY_HEX) {
      throw new Error('ENCRYPTION_KEY environment variable is required. Please add it to your CapRover/Coolify environment variables (32-byte hex string).');
    }
    // Fix: AES-256-CBC uses 32-byte key (128 hex chars)
    // Accept 64 or 128 hex characters (32 or 64 bytes) for flexibility
    if (ENCRYPTION_KEY_HEX.length !== 64 && ENCRYPTION_KEY_HEX.length !== 128) {
      throw new Error('ENCRYPTION_KEY must be a 32-byte hex string (128 hex characters) or 64-byte hex string. Please generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    }
    // Truncate to 32 bytes (128 hex chars) if key is longer
    const keyToUse = ENCRYPTION_KEY_HEX.length === 128 
      ? ENCRYPTION_KEY_HEX.substring(0, 128)
      : ENCRYPTION_KEY_HEX;
    ENCRYPTION_KEY = Buffer.from(keyToUse, 'hex');
  }

  // Encrypt accessToken on create
  if (params.model === 'SocialConnection' && params.action === 'create' && params.args.data.accessToken) {
    if (ENCRYPTION_KEY) {
      params.args.data.accessToken = encrypt(params.args.data.accessToken, ENCRYPTION_KEY);
    }
  }

  // Encrypt accessToken on update
  if (params.model === 'SocialConnection' && params.action === 'update' && params.args.data.accessToken) {
    if (ENCRYPTION_KEY) {
      params.args.data.accessToken = encrypt(params.args.data.accessToken, ENCRYPTION_KEY);
    }
  }

  // Fix Bug #4: Remove invalid WHERE clause encryption logic
  // Prisma doesn't support encrypting/decrypting WHERE clause values
  // These operations must be done differently or at application layer

  const result = await next(params);

  // Decrypt accessToken after findUnique
  if (params.model === 'SocialConnection' && params.action === 'findUnique' && result) {
    if (result.accessToken && ENCRYPTION_KEY) {
      result.accessToken = decrypt(result.accessToken, ENCRYPTION_KEY);
    }
  }

  // Decrypt accessToken after findMany
  if (params.model === 'SocialConnection' && params.action === 'findMany') {
    if (Array.isArray(result)) {
      result.forEach(item => {
        if (item.accessToken && ENCRYPTION_KEY) {
          item.accessToken = decrypt(item.accessToken, ENCRYPTION_KEY);
        }
      });
    }
  }

  return result;
});

// Fix Bug #1: Replace deprecated createCipher with createCipheriv
function encrypt(text: string, key: Buffer): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// Fix Bug #1: Replace deprecated createDecipher with createDecipheriv
function decrypt(encryptedText: string, key: Buffer): string {
  const [ivHex, encryptedHex] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  decipher.setAutoPadding(true);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

export default prisma;

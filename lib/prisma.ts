import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Middleware for encrypting sensitive fields (e.g., accessToken in SocialConnection)
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32-byte key from env

prisma.$use(async (params, next) => {
  if (params.model === 'SocialConnection' && params.action === 'create' && params.args.data.accessToken) {
    params.args.data.accessToken = encrypt(params.args.data.accessToken, ENCRYPTION_KEY);
  }

  if (params.model === 'SocialConnection' && params.action === 'update' && params.args.data.accessToken) {
    params.args.data.accessToken = encrypt(params.args.data.accessToken, ENCRYPTION_KEY);
  }

  if (params.model === 'SocialConnection' && params.action === 'findUnique' && params.args.where.accessToken) {
    params.args.where.accessToken = decrypt(params.args.where.accessToken, ENCRYPTION_KEY);
  }

  if (params.model === 'SocialConnection' && params.action === 'findMany' && params.args.where.accessToken) {
    params.args.where.accessToken = decrypt(params.args.where.accessToken, ENCRYPTION_KEY);
  }

  const result = await next(params);

  if (params.model === 'SocialConnection' && params.action === 'findUnique' && result) {
    if (result.accessToken) {
      result.accessToken = decrypt(result.accessToken, ENCRYPTION_KEY);
    }
  }

  if (params.model === 'SocialConnection' && params.action === 'findMany') {
    if (Array.isArray(result)) {
      result.forEach(item => {
        if (item.accessToken) {
          item.accessToken = decrypt(item.accessToken, ENCRYPTION_KEY);
        }
      });
    }
  }

  return result;
});

function encrypt(text: string, key: Buffer): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher('aes-256-cbc', key);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]).toString('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText: string, key: Buffer): string {
  const [ivHex, encryptedHex] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipher('aes-256-cbc', key);
  decipher.setAutoPadding(true);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString();
}

export default prisma;

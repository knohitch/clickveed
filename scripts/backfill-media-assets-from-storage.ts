import AWS from 'aws-sdk';
import { initializeStorageFromDB, storageManager } from '@/lib/storage';
import prisma from '@/server/prisma';

type MediaKind = 'IMAGE' | 'VIDEO' | 'AUDIO';

function getArgValue(name: string): string | null {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function inferMediaTypeFromFilename(filename: string): MediaKind | null {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(extension)) return 'IMAGE';
  if (['mp4', 'mov', 'webm', 'avi', 'mkv', 'm4v'].includes(extension)) return 'VIDEO';
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(extension)) return 'AUDIO';
  return null;
}

function parseStorageKey(key: string): { userId: string; filename: string } | null {
  const normalized = key.replace(/^\/+/, '');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length < 3) return null;
  if (parts[0] !== 'media') return null;
  const userId = parts[1];
  const filename = parts[parts.length - 1];
  if (!userId || !filename) return null;
  return { userId, filename };
}

async function main() {
  const dryRun = !hasFlag('apply');
  const maxObjectsArg = getArgValue('max');
  const maxObjects = maxObjectsArg ? Number(maxObjectsArg) : 5000;
  const prefix = getArgValue('prefix') || 'media/';

  if (!Number.isFinite(maxObjects) || maxObjects <= 0) {
    throw new Error('Invalid --max value. Example: --max=5000');
  }

  console.log('[backfill-media] Starting...');
  console.log(`[backfill-media] Mode: ${dryRun ? 'DRY RUN' : 'APPLY'}`);
  console.log(`[backfill-media] Prefix: ${prefix}`);
  console.log(`[backfill-media] Max objects: ${maxObjects}`);

  await initializeStorageFromDB();
  if (!storageManager.isConfigured()) {
    throw new Error('Storage is not configured. Configure Wasabi credentials first.');
  }

  const config = storageManager.getConfig();
  const s3 = new AWS.S3({
    endpoint: `https://${config.wasabi.endpoint}`,
    region: config.wasabi.region,
    credentials: {
      accessKeyId: config.wasabi.accessKeyId,
      secretAccessKey: config.wasabi.secretAccessKey,
    },
    s3ForcePathStyle: true,
    signatureVersion: 'v4',
  });

  const knownUserCache = new Map<string, boolean>();
  const seenKeyUrls = new Set<string>();
  const summary = {
    scanned: 0,
    validCandidates: 0,
    skippedInvalidKey: 0,
    skippedUnknownUser: 0,
    skippedUnknownType: 0,
    alreadyExists: 0,
    created: 0,
    failed: 0,
  };

  let continuationToken: string | undefined;
  let shouldContinue = true;

  while (shouldContinue) {
    const page = await s3.listObjectsV2({
      Bucket: config.wasabi.bucket,
      Prefix: prefix,
      MaxKeys: Math.min(1000, maxObjects - summary.scanned),
      ContinuationToken: continuationToken,
    }).promise();

    const objects = page.Contents || [];
    if (objects.length === 0) break;

    for (const object of objects) {
      const key = object.Key || '';
      if (!key) continue;

      summary.scanned += 1;
      if (summary.scanned > maxObjects) {
        shouldContinue = false;
        break;
      }

      const parsed = parseStorageKey(key);
      if (!parsed) {
        summary.skippedInvalidKey += 1;
        continue;
      }

      const mediaType = inferMediaTypeFromFilename(parsed.filename);
      if (!mediaType) {
        summary.skippedUnknownType += 1;
        continue;
      }

      let userExists = knownUserCache.get(parsed.userId);
      if (userExists === undefined) {
        const user = await prisma.user.findUnique({
          where: { id: parsed.userId },
          select: { id: true },
        });
        userExists = !!user;
        knownUserCache.set(parsed.userId, userExists);
      }
      if (!userExists) {
        summary.skippedUnknownUser += 1;
        continue;
      }

      const fileUrl = storageManager.getCdnUrl(key);
      if (seenKeyUrls.has(fileUrl)) continue;
      seenKeyUrls.add(fileUrl);

      summary.validCandidates += 1;

      const existing = await prisma.mediaAsset.findFirst({
        where: {
          userId: parsed.userId,
          url: fileUrl,
        },
        select: { id: true },
      });

      if (existing) {
        summary.alreadyExists += 1;
        continue;
      }

      if (dryRun) continue;

      try {
        await prisma.mediaAsset.create({
          data: {
            userId: parsed.userId,
            name: decodeURIComponent(parsed.filename),
            type: mediaType,
            url: fileUrl,
            size: (object.Size || 0) / (1024 * 1024),
            createdAt: object.LastModified || new Date(),
          },
        });
        summary.created += 1;
      } catch (error) {
        summary.failed += 1;
        console.error('[backfill-media] Failed to create media row', {
          key,
          userId: parsed.userId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
    if (!continuationToken) break;
    if (summary.scanned >= maxObjects) break;
  }

  console.log('[backfill-media] Completed');
  console.table(summary);

  if (dryRun) {
    console.log('[backfill-media] Dry run only. Re-run with --apply to write changes.');
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('[backfill-media] Failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });

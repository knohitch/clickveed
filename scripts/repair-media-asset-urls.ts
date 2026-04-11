import prisma from '@/server/prisma';
import { initializeStorageFromDB, storageManager } from '@/lib/storage';

type PreferMode = 'auto' | 'storage' | 'cdn';
type ProbeResult = 'reachable' | 'unreachable' | 'unknown';

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function getArgValue(name: string): string | null {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function normalizeUrl(raw: string): string {
  const value = String(raw || '').replace(/[\u200B-\u200D\uFEFF\u00A0\r\n\t]/g, '').trim();
  if (!value) return value;
  if (/^https?:\/\//i.test(value) || value.startsWith('data:')) return value;
  if (value.startsWith('//')) return `https:${value}`;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(value)) return `https://${value}`;
  return value;
}

function extractStorageKeyFromUrl(rawUrl: string): string | null {
  const normalized = normalizeUrl(rawUrl);
  if (!normalized) return null;

  try {
    const parsed = new URL(normalized);
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length === 0) return null;

    const knownRoots = new Set(['media', 'images', 'videos', 'audio']);
    const rootIndex = segments.findIndex((segment) => knownRoots.has(segment.toLowerCase()));
    if (rootIndex >= 0) {
      return segments.slice(rootIndex).join('/');
    }

    if (segments.length >= 2 && knownRoots.has(segments[1].toLowerCase())) {
      return segments.slice(1).join('/');
    }

    return segments.join('/');
  } catch {
    return null;
  }
}

async function probeReachability(url: string): Promise<ProbeResult> {
  try {
    const head = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    if (head.ok) return 'reachable';

    if (head.status === 405 || head.status === 501) {
      const get = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        headers: { Range: 'bytes=0-0' },
      });
      if (get.ok || get.status === 206) return 'reachable';
    }

    return 'unreachable';
  } catch {
    return 'unknown';
  }
}

function parsePreferMode(value: string | null): PreferMode {
  if (value === 'storage' || value === 'cdn' || value === 'auto') return value;
  return 'auto';
}

async function chooseUrl(options: {
  storageUrl: string;
  cdnUrl: string;
  prefer: PreferMode;
  shouldProbe: boolean;
}): Promise<{ chosen: string; storageProbe: ProbeResult; cdnProbe: ProbeResult }> {
  const { storageUrl, cdnUrl, prefer, shouldProbe } = options;

  if (prefer === 'storage') {
    return { chosen: storageUrl, storageProbe: 'unknown', cdnProbe: 'unknown' };
  }
  if (prefer === 'cdn') {
    return { chosen: cdnUrl, storageProbe: 'unknown', cdnProbe: 'unknown' };
  }

  if (!shouldProbe) {
    return { chosen: cdnUrl || storageUrl, storageProbe: 'unknown', cdnProbe: 'unknown' };
  }

  const [cdnProbe, storageProbe] = await Promise.all([
    probeReachability(cdnUrl),
    probeReachability(storageUrl),
  ]);

  if (cdnProbe === 'reachable') {
    return { chosen: cdnUrl, storageProbe, cdnProbe };
  }

  if (storageProbe === 'reachable') {
    return { chosen: storageUrl, storageProbe, cdnProbe };
  }

  return { chosen: storageUrl, storageProbe, cdnProbe };
}

async function main() {
  const dryRun = !hasFlag('apply');
  const limitRaw = getArgValue('limit');
  const limit = limitRaw ? Number(limitRaw) : 5000;
  const batchSizeRaw = getArgValue('batch');
  const batchSize = batchSizeRaw ? Number(batchSizeRaw) : 200;
  const prefer = parsePreferMode(getArgValue('prefer'));
  const shouldProbe = !hasFlag('no-probe');

  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error('Invalid --limit value. Example: --limit=5000');
  }
  if (!Number.isFinite(batchSize) || batchSize <= 0 || batchSize > 1000) {
    throw new Error('Invalid --batch value. Example: --batch=200');
  }

  console.log('[repair-media-urls] Starting...');
  console.log(`[repair-media-urls] Mode: ${dryRun ? 'DRY RUN' : 'APPLY'}`);
  console.log(`[repair-media-urls] Prefer: ${prefer}`);
  console.log(`[repair-media-urls] Probe URLs: ${shouldProbe}`);
  console.log(`[repair-media-urls] Limit: ${limit}, Batch: ${batchSize}`);

  await initializeStorageFromDB();
  if (!storageManager.isConfigured()) {
    throw new Error('Storage is not configured. Configure storage before repairing media URLs.');
  }

  const summary = {
    scanned: 0,
    candidates: 0,
    unchanged: 0,
    noStorageKey: 0,
    fixedNormalizationOnly: 0,
    updated: 0,
    failed: 0,
  };

  let cursorId = 0;

  while (summary.scanned < limit) {
    const remaining = limit - summary.scanned;
    const rows = await prisma.mediaAsset.findMany({
      where: { id: { gt: cursorId } },
      orderBy: { id: 'asc' },
      take: Math.min(batchSize, remaining),
      select: { id: true, url: true },
    });

    if (rows.length === 0) break;

    for (const row of rows) {
      summary.scanned += 1;
      cursorId = row.id;

      const originalUrl = String(row.url || '');
      const normalizedOriginal = normalizeUrl(originalUrl);
      const storageKey = extractStorageKeyFromUrl(normalizedOriginal);

      let nextUrl = normalizedOriginal;
      let hasConcreteFix = false;

      if (!storageKey) {
        summary.noStorageKey += 1;
      } else {
        const storageUrl = storageManager.getFileUrl(storageKey);
        const cdnUrl = storageManager.getCdnUrl(storageKey);
        const chosen = await chooseUrl({
          storageUrl,
          cdnUrl,
          prefer,
          shouldProbe,
        });
        nextUrl = chosen.chosen;
        hasConcreteFix = true;
      }

      if (!nextUrl || nextUrl === normalizedOriginal) {
        if (normalizedOriginal === originalUrl) {
          summary.unchanged += 1;
        } else {
          summary.fixedNormalizationOnly += 1;
          if (!dryRun) {
            try {
              await prisma.mediaAsset.update({
                where: { id: row.id },
                data: { url: normalizedOriginal },
              });
              summary.updated += 1;
            } catch (error) {
              summary.failed += 1;
              console.error('[repair-media-urls] Failed to apply normalized URL', {
                assetId: row.id,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }
        }
        continue;
      }

      summary.candidates += 1;
      if (!hasConcreteFix) continue;

      if (!dryRun) {
        try {
          await prisma.mediaAsset.update({
            where: { id: row.id },
            data: { url: nextUrl },
          });
          summary.updated += 1;
        } catch (error) {
          summary.failed += 1;
          console.error('[repair-media-urls] Failed to update media URL', {
            assetId: row.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }

  console.log('[repair-media-urls] Completed');
  console.table(summary);
  if (dryRun) {
    console.log('[repair-media-urls] Dry run only. Re-run with --apply to write changes.');
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('[repair-media-urls] Failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });

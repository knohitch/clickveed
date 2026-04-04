function stripInvisibleChars(value: string): string {
  return value
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ');
}

function normalizeStorageKey(keyOrUrl: string): string {
  const cleaned = stripInvisibleChars(keyOrUrl || '').trim();
  if (!cleaned) return '';

  if (/^https?:\/\//i.test(cleaned)) {
    try {
      const parsed = new URL(cleaned);
      const segments = parsed.pathname.split('/').filter(Boolean);
      if (segments.length === 0) return '';

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
      return '';
    }
  }

  return cleaned.replace(/^\/+/, '');
}

export function getUserOwnedStorageKey(keyOrUrl: string, userId: string): string | null {
  const normalizedKey = normalizeStorageKey(keyOrUrl);
  if (!normalizedKey) {
    return null;
  }

  const expectedPrefix = `media/${userId}/`;
  if (!normalizedKey.startsWith(expectedPrefix)) {
    return null;
  }

  return normalizedKey;
}

import 'server-only';

import { unstable_noStore as noStore } from 'next/cache';
import { getAdminSettings } from '@/server/actions/admin-actions';

const DEFAULT_APP_NAME = 'AI Video Creator';
const DEFAULT_DESCRIPTION = 'The All-in-One AI Video Creation Suite';

function stripInvisibleChars(value: string): string {
  return value.replace(/[\u200B-\u200D\uFEFF\u00A0\r\n\t]/g, '').trim();
}

function normalizeAssetUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  const value = stripInvisibleChars(rawUrl);
  if (!value) return null;
  if (value.startsWith('data:') || value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')) {
    return value;
  }
  if (value.startsWith('//')) {
    return `https:${value}`;
  }
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(value)) {
    return `https://${value}`;
  }
  return null;
}

export interface BrandingMetadata {
  appName: string;
  description: string;
  faviconUrl: string | null;
}

export async function getBrandingMetadata(): Promise<BrandingMetadata> {
  // We need fresh branding values after admin changes.
  noStore();

  try {
    const settings = await getAdminSettings();
    const appName = stripInvisibleChars(settings.appName || '') || process.env.NEXT_PUBLIC_APP_NAME || DEFAULT_APP_NAME;
    return {
      appName,
      description: DEFAULT_DESCRIPTION,
      faviconUrl: normalizeAssetUrl(settings.faviconUrl),
    };
  } catch {
    return {
      appName: process.env.NEXT_PUBLIC_APP_NAME || DEFAULT_APP_NAME,
      description: DEFAULT_DESCRIPTION,
      faviconUrl: null,
    };
  }
}

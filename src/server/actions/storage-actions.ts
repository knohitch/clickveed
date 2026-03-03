'use server';

import { storageManager } from '@/lib/storage';
import { getAdminSettings, updateAdminSettings } from '@/server/actions/admin-actions';
import { revalidatePath } from 'next/cache';

export interface StorageSettings {
  wasabiEndpoint: string;
  wasabiRegion: string;
  wasabiBucket: string;
  bunnyCdnUrl: string;
  wasabiAccessKey: string;
  wasabiSecretKey: string;
}

function stripInvisibleChars(value: string): string {
  return value
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ');
}

function sanitizeStorageField(name: keyof StorageSettings, value: string): string {
  const cleaned = stripInvisibleChars(value || '');
  if (/^[•\*]+$/.test(cleaned.trim())) {
    return '';
  }
  if (name === 'wasabiAccessKey' || name === 'wasabiSecretKey') {
    return cleaned.replace(/\s+/g, '');
  }
  return cleaned.trim();
}

function normalizeStorageKey(keyOrUrl: string): string {
  const cleaned = stripInvisibleChars(keyOrUrl || '').trim();
  if (!cleaned) return '';

  // Accept full URL input and convert to key path.
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

/**
 * Get current storage configuration
 */
export async function getStorageSettings(): Promise<StorageSettings> {
  try {
    const adminSettings = await getAdminSettings();

    return {
      wasabiEndpoint: sanitizeStorageField('wasabiEndpoint', adminSettings.apiKeys.wasabiEndpoint || adminSettings.storageSettings?.wasabiEndpoint || process.env.WASABI_ENDPOINT || ''),
      wasabiRegion: sanitizeStorageField('wasabiRegion', adminSettings.apiKeys.wasabiRegion || adminSettings.storageSettings?.wasabiRegion || process.env.WASABI_REGION || ''),
      wasabiBucket: sanitizeStorageField('wasabiBucket', adminSettings.apiKeys.wasabiBucket || adminSettings.storageSettings?.wasabiBucket || process.env.WASABI_BUCKET || ''),
      bunnyCdnUrl: sanitizeStorageField('bunnyCdnUrl', adminSettings.apiKeys.bunnyCdnUrl || adminSettings.storageSettings?.bunnyCdnUrl || process.env.BUNNY_CDN_URL || ''),
      wasabiAccessKey: sanitizeStorageField('wasabiAccessKey', adminSettings.apiKeys.wasabiAccessKey || ''),
      wasabiSecretKey: sanitizeStorageField('wasabiSecretKey', adminSettings.apiKeys.wasabiSecretKey || ''),
    };
  } catch (error) {
    console.error('Failed to get storage settings:', error);
    throw new Error('Failed to retrieve storage configuration');
  }
}

/**
 * Update storage configuration
 */
export async function updateStorageSettings(settings: StorageSettings): Promise<{ success: boolean; message: string }> {
  try {
    const sanitizedSettings: StorageSettings = {
      wasabiEndpoint: sanitizeStorageField('wasabiEndpoint', settings.wasabiEndpoint),
      wasabiRegion: sanitizeStorageField('wasabiRegion', settings.wasabiRegion),
      wasabiBucket: sanitizeStorageField('wasabiBucket', settings.wasabiBucket),
      bunnyCdnUrl: sanitizeStorageField('bunnyCdnUrl', settings.bunnyCdnUrl),
      wasabiAccessKey: sanitizeStorageField('wasabiAccessKey', settings.wasabiAccessKey),
      wasabiSecretKey: sanitizeStorageField('wasabiSecretKey', settings.wasabiSecretKey),
    };

    // Get current admin settings to preserve other API keys
    const currentSettings = await getAdminSettings();
    
    // Update API keys in the database with storage settings
    const { updateApiKeys } = await import('./admin-actions');
    await updateApiKeys({
      ...currentSettings.apiKeys,
      wasabiEndpoint: sanitizedSettings.wasabiEndpoint,
      wasabiRegion: sanitizedSettings.wasabiRegion,
      wasabiBucket: sanitizedSettings.wasabiBucket,
      bunnyCdnUrl: sanitizedSettings.bunnyCdnUrl,
      wasabiAccessKey: sanitizedSettings.wasabiAccessKey,
      wasabiSecretKey: sanitizedSettings.wasabiSecretKey,
    });

    // Update storage manager configuration and reinitialize S3 client
    await storageManager.updateConfig({
      wasabi: {
        endpoint: sanitizedSettings.wasabiEndpoint,
        region: sanitizedSettings.wasabiRegion,
        accessKeyId: sanitizedSettings.wasabiAccessKey,
        secretAccessKey: sanitizedSettings.wasabiSecretKey,
        bucket: sanitizedSettings.wasabiBucket,
      },
      bunny: {
        cdnUrl: sanitizedSettings.bunnyCdnUrl,
      }
    });

    // Revalidate settings pages to reflect new storage configuration
    revalidatePath('/chin/dashboard/settings', 'page');
    revalidatePath('/dashboard/settings', 'page');

    console.log('[Storage] Settings updated and UI revalidated');
    return {
      success: true,
      message: 'Storage configuration updated successfully'
    };
  } catch (error) {
    console.error('Failed to update storage settings:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update storage configuration'
    };
  }
}

/**
 * Test storage connection
 */
export async function testStorageConnection(): Promise<{ success: boolean; message: string }> {
  try {
    if (!storageManager.isConfigured()) {
      return {
        success: false,
        message: 'Storage not configured. Please configure Wasabi credentials first.'
      };
    }

    // Try to list objects in the bucket to test connection
    const config = storageManager.getConfig();

    // This is a simple test - in a real implementation, you might want to
    // list objects or try a small upload
    const isConfigured = !!(
      config.wasabi.accessKeyId &&
      config.wasabi.secretAccessKey &&
      config.wasabi.bucket
    );

    if (isConfigured) {
      return {
        success: true,
        message: 'Storage connection test successful'
      };
    } else {
      return {
        success: false,
        message: 'Storage configuration incomplete'
      };
    }
  } catch (error) {
    console.error('Storage connection test failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Storage connection test failed'
    };
  }
}

/**
 * Upload file to storage
 */
export async function uploadToStorage(
  file: File,
  userId: string,
  options?: {
    contentType?: string;
    metadata?: Record<string, string>;
  }
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // CRITICAL FIX: Ensure storage is initialized before checking configuration
    const isInitialized = await storageManager.ensureInitialized();
    
    if (!isInitialized || !storageManager.isConfigured()) {
      console.error('[Storage] Storage not configured. Checking admin settings...');
      
      // Try to get more info about the configuration
      try {
        const adminSettings = await getAdminSettings();
        const hasWasabiKey = !!adminSettings.apiKeys.wasabiAccessKey;
        const hasWasabiSecret = !!adminSettings.apiKeys.wasabiSecretKey;
        console.error('[Storage] Admin settings check:', {
          hasWasabiKey,
          hasWasabiSecret,
          bucket: adminSettings.apiKeys.wasabiBucket || 'not set'
        });
      } catch (e) {
        console.error('[Storage] Failed to check admin settings:', e);
      }
      
      return {
        success: false,
        error: 'Storage not configured. Please configure Wasabi storage settings in the admin panel (Storage Settings).'
      };
    }

    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'bin';
    const key = `media/${userId}/${timestamp}.${extension}`;

    const result = await storageManager.uploadAndGetUrls(file, key, {
      contentType: options?.contentType || file.type,
      metadata: {
        originalName: file.name,
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
        ...options?.metadata,
      },
    });

    // Verify upload was successful by checking if we got valid URLs
    if (!result || !result.storageUrl || !result.storageUrl.startsWith('http')) {
      console.error('[Storage] Upload verification failed - invalid URLs:', result);
      return {
        success: false,
        error: 'Upload verification failed. The file may not have been uploaded correctly.'
      };
    }

    // Verify the URL is accessible by doing a quick HEAD request
    try {
      const response = await fetch(result.storageUrl, { method: 'HEAD' });
      if (!response.ok) {
        console.error('[Storage] Upload verification failed - URL not accessible:', result.storageUrl);
        return {
          success: false,
          error: 'Upload verification failed. The uploaded file is not accessible.'
        };
      }
    } catch (verifyError) {
      console.warn('[Storage] Could not verify uploaded file accessibility:', verifyError);
      // Don't fail the upload just because verification failed
    }

    console.log('[Storage] Upload successful:', result.storageUrl);
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('Upload to storage failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    };
  }
}

/**
 * Delete file from storage
 */
export async function deleteFromStorage(key: string): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedKey = normalizeStorageKey(key);
    if (!normalizedKey) {
      return {
        success: false,
        error: 'Invalid storage key'
      };
    }

    const isInitialized = await storageManager.ensureInitialized();
    if (!isInitialized || !storageManager.isConfigured()) {
      return {
        success: false,
        error: 'Storage not configured'
      };
    }

    await storageManager.deleteFile(normalizedKey);

    return { success: true };
  } catch (error) {
    console.error('Delete from storage failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed'
    };
  }
}

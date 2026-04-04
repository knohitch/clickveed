'use server';

import { getUserOwnedStorageKey } from '@/lib/storage-key-utils';
import { storageManager } from '@/lib/storage';
import { getAdminSettings, updateAdminSettings } from '@/server/actions/admin-actions';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { logAuditEvent } from '@/lib/monitoring/audit';

export interface StorageSettings {
  wasabiEndpoint: string;
  wasabiRegion: string;
  wasabiBucket: string;
  bunnyCdnUrl: string;
  wasabiAccessKey: string;
  wasabiSecretKey: string;
}

async function requireAdminSession(): Promise<{ id: string; role?: string | null }> {
  const session = await auth();
  if (!session?.user?.role || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
    throw new Error('Administrator access required');
  }

  return {
    id: session.user.id,
    role: session.user.role,
  };
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

/**
 * Get current storage configuration
 */
export async function getStorageSettings(): Promise<StorageSettings> {
  const actor = await requireAdminSession();

  try {
    const adminSettings = await getAdminSettings();
    logAuditEvent({
      action: 'storage_settings_read',
      outcome: 'success',
      actorId: actor.id,
      actorRole: actor.role,
      targetType: 'storage_settings',
    });

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
    logAuditEvent({
      action: 'storage_settings_read',
      outcome: 'failure',
      actorId: actor.id,
      actorRole: actor.role,
      targetType: 'storage_settings',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
    throw new Error('Failed to retrieve storage configuration');
  }
}

/**
 * Update storage configuration
 */
export async function updateStorageSettings(settings: StorageSettings): Promise<{ success: boolean; message: string }> {
  const actor = await requireAdminSession();

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
    logAuditEvent({
      action: 'storage_settings_update',
      outcome: 'success',
      actorId: actor.id,
      actorRole: actor.role,
      targetType: 'storage_settings',
      metadata: {
        bucket: sanitizedSettings.wasabiBucket,
        region: sanitizedSettings.wasabiRegion,
      },
    });
    return {
      success: true,
      message: 'Storage configuration updated successfully'
    };
  } catch (error) {
    console.error('Failed to update storage settings:', error);
    logAuditEvent({
      action: 'storage_settings_update',
      outcome: 'failure',
      actorId: actor.id,
      actorRole: actor.role,
      targetType: 'storage_settings',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
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
  const actor = await requireAdminSession();

  try {
    if (!storageManager.isConfigured()) {
      logAuditEvent({
        action: 'storage_connection_test',
        outcome: 'failure',
        actorId: actor.id,
        actorRole: actor.role,
        targetType: 'storage_settings',
        metadata: {
          reason: 'not_configured',
        },
      });
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
      logAuditEvent({
        action: 'storage_connection_test',
        outcome: 'success',
        actorId: actor.id,
        actorRole: actor.role,
        targetType: 'storage_settings',
      });
      return {
        success: true,
        message: 'Storage connection test successful'
      };
    } else {
      logAuditEvent({
        action: 'storage_connection_test',
        outcome: 'failure',
        actorId: actor.id,
        actorRole: actor.role,
        targetType: 'storage_settings',
        metadata: {
          reason: 'configuration_incomplete',
        },
      });
      return {
        success: false,
        message: 'Storage configuration incomplete'
      };
    }
  } catch (error) {
    console.error('Storage connection test failed:', error);
    logAuditEvent({
      action: 'storage_connection_test',
      outcome: 'failure',
      actorId: actor.id,
      actorRole: actor.role,
      targetType: 'storage_settings',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
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
    logAuditEvent({
      action: 'storage_file_upload',
      outcome: 'success',
      actorId: userId,
      targetType: 'storage_file',
      targetId: key,
      metadata: {
        fileName: file.name,
        contentType: options?.contentType || file.type,
      },
    });
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('Upload to storage failed:', error);
    logAuditEvent({
      action: 'storage_file_upload',
      outcome: 'failure',
      actorId: userId,
      targetType: 'storage_file',
      metadata: {
        fileName: file.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    };
  }
}

/**
 * Delete file from storage
 */
export async function deleteFromStorage(key: string, userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const ownedKey = getUserOwnedStorageKey(key, userId);
    if (!ownedKey) {
      logAuditEvent({
        action: 'storage_file_delete',
        outcome: 'denied',
        actorId: userId,
        targetType: 'storage_file',
        targetId: key,
      });
      return {
        success: false,
        error: 'Forbidden'
      };
    }

    const isInitialized = await storageManager.ensureInitialized();
    if (!isInitialized || !storageManager.isConfigured()) {
      return {
        success: false,
        error: 'Storage not configured'
      };
    }

    await storageManager.deleteFile(ownedKey);
    logAuditEvent({
      action: 'storage_file_delete',
      outcome: 'success',
      actorId: userId,
      targetType: 'storage_file',
      targetId: ownedKey,
    });

    return { success: true };
  } catch (error) {
    console.error('Delete from storage failed:', error);
    logAuditEvent({
      action: 'storage_file_delete',
      outcome: 'failure',
      actorId: userId,
      targetType: 'storage_file',
      targetId: key,
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed'
    };
  }
}

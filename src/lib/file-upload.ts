/**
 * File Upload and Management Utilities
 * Provides easy-to-use functions for uploading, downloading, and managing files
 */

export interface FileUploadOptions {
  metadata?: Record<string, any>;
  contentType?: string;
  onProgress?: (progress: number) => void;
}

export interface FileUploadResult {
  success: boolean;
  data?: {
    storageUrl: string;
    cdnUrl: string;
    key: string;
  };
  error?: string;
}

export interface FileDownloadResult {
  success: boolean;
  data?: {
    url: string;
    key: string;
    useCDN: boolean;
  };
  error?: string;
}

export interface FileDeleteResult {
  success: boolean;
  error?: string;
}

/**
 * Upload a file to storage
 */
export async function uploadFile(
  file: File,
  options: FileUploadOptions = {}
): Promise<FileUploadResult> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    if (options.contentType) {
      formData.append('contentType', options.contentType);
    }

    if (options.metadata) {
      formData.append('metadata', JSON.stringify(options.metadata));
    }

    const response = await fetch('/api/storage/upload', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Upload failed'
      };
    }

    return {
      success: true,
      data: result.data
    };

  } catch (error) {
    console.error('File upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    };
  }
}

/**
 * Get download URL for a file
 */
export async function getFileUrl(
  key: string,
  useCDN: boolean = true
): Promise<FileDownloadResult> {
  try {
    const params = new URLSearchParams({ key, cdn: useCDN.toString() });
    const response = await fetch(`/api/storage/download?${params}`);

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to get file URL'
      };
    }

    return {
      success: true,
      data: result.data
    };

  } catch (error) {
    console.error('Get file URL error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get file URL'
    };
  }
}

/**
 * Delete a file from storage
 */
export async function deleteFile(key: string): Promise<FileDeleteResult> {
  try {
    const params = new URLSearchParams({ key });
    const response = await fetch(`/api/storage/delete?${params}`, {
      method: 'DELETE',
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Delete failed'
      };
    }

    return {
      success: true
    };

  } catch (error) {
    console.error('File delete error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed'
    };
  }
}

/**
 * Upload multiple files
 */
export async function uploadMultipleFiles(
  files: File[],
  options: FileUploadOptions = {}
): Promise<(FileUploadResult & { file: File })[]> {
  const results = await Promise.allSettled(
    files.map(file => uploadFile(file, options).then(result => ({ ...result, file })))
  );

  return results.map(result =>
    result.status === 'fulfilled'
      ? result.value
      : { success: false, error: 'Upload failed', file: {} as File }
  );
}

/**
 * Generate a unique file key
 */
export function generateFileKey(userId: string, fileName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = fileName.split('.').pop() || 'bin';

  return `uploads/${userId}/${timestamp}_${random}.${extension}`;
}

/**
 * Validate file before upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size (50MB limit)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size too large. Maximum 50MB allowed.'
    };
  }

  // Check file type
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'audio/mpeg',
    'audio/wav',
    'audio/mp3',
    'application/pdf'
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
    };
  }

  return { valid: true };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file type category
 */
export function getFileTypeCategory(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'document';

  return 'other';
}

/**
 * Create a preview URL for images and videos
 */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Clean up preview URL
 */
export function revokePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}

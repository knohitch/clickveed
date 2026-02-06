import { NextRequest } from 'next/server';

// Allowed file types for uploads
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'audio/mpeg',
  'audio/wav',
  'application/pdf'
];

// Maximum file sizes (in bytes)
const MAX_FILE_SIZES = {
  image: 10 * 1024 * 1024, // 10MB
  video: 100 * 1024 * 1024, // 100MB
  audio: 50 * 1024 * 1024, // 50MB
  document: 10 * 1024 * 1024 // 10MB
};

/**
 * Validate file upload security
 */
export function validateFile(file: File, fileType: 'image' | 'video' | 'audio' | 'document'): {
  isValid: boolean;
  error?: string;
} {
  // Check file size
  const maxSize = MAX_FILE_SIZES[fileType];
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File too large. Maximum size for ${fileType} is ${maxSize / (1024 * 1024)}MB.`
    };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
    };
  }

  // Check file extension (additional validation)
  const allowedExtensions = {
    image: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    video: ['.mp4', '.mov', '.avi', '.wmv'],
    audio: ['.mp3', '.wav', '.ogg'],
    document: ['.pdf', '.doc', '.docx']
  };

  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  const validExtensions = allowedExtensions[fileType];
  
  if (!validExtensions.includes(ext)) {
    return {
      isValid: false,
      error: `Invalid file extension. Allowed extensions for ${fileType}: ${validExtensions.join(', ')}`
    };
  }

  return { isValid: true };
}

/**
 * Sanitize filename to prevent path traversal attacks
 */
export function sanitizeFilename(filename: string): string {
  // Remove path traversal sequences
  filename = filename.replace(/(\.\.\/|\/)/g, '');
  
  // Remove dangerous characters
  filename = filename.replace(/[<>:"|?*]/g, '');
  
  // Limit length
  if (filename.length > 100) {
    const ext = filename.split('.').pop();
    const name = filename.substring(0, filename.lastIndexOf('.'));
    filename = name.substring(0, 100 - (ext ? ext.length + 1 : 0)) + (ext ? `.${ext}` : '');
  }
  
  return filename || 'unnamed-file';
}

'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  uploadFile,
  getFileUrl,
  deleteFile,
  validateFile,
  formatFileSize,
  getFileTypeCategory,
  FileUploadResult,
  FileDownloadResult,
  FileDeleteResult,
  FileUploadOptions
} from '@/lib/file-upload';

interface UseFileUploadOptions {
  onUploadSuccess?: (result: FileUploadResult) => void;
  onUploadError?: (error: string) => void;
  onDeleteSuccess?: (key: string) => void;
  onDeleteError?: (error: string) => void;
}

interface FileWithPreview {
  file: File;
  preview?: string;
  key?: string;
  url?: string;
  error?: string;
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [files, setFiles] = useState<FileWithPreview[]>([]);

  const addFiles = useCallback((newFiles: File[]) => {
    const filesWithPreview: FileWithPreview[] = newFiles.map(file => {
      const validation = validateFile(file);

      if (!validation.valid) {
        toast({
          title: "Invalid File",
          description: validation.error,
          variant: "destructive"
        });
        return { file, error: validation.error };
      }

      return {
        file,
        preview: getFileTypeCategory(file.type) === 'image' ? URL.createObjectURL(file) : undefined
      };
    }).filter(f => !f.error);

    setFiles(prev => [...prev, ...filesWithPreview]);
  }, [toast]);

  const removeFile = useCallback((index: number) => {
    const fileToRemove = files[index];

    // Clean up preview URL
    if (fileToRemove.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }

    setFiles(prev => prev.filter((_, i) => i !== index));
  }, [files]);

  const clearFiles = useCallback(() => {
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setFiles([]);
  }, [files]);

  const uploadSingleFile = useCallback(async (
    file: File,
    uploadOptions: FileUploadOptions = {}
  ): Promise<FileUploadResult> => {
    setUploading(true);

    try {
      const result = await uploadFile(file, uploadOptions);

      if (result.success && result.data) {
        // Update file with uploaded data
        setFiles(prev => prev.map(f =>
          f.file === file
            ? { ...f, key: result.data!.key, url: result.data!.cdnUrl }
            : f
        ));

        options.onUploadSuccess?.(result);

        toast({
          title: "Upload Successful",
          description: `${file.name} uploaded successfully`,
        });
      } else {
        options.onUploadError?.(result.error || 'Upload failed');

        toast({
          title: "Upload Failed",
          description: result.error || 'Upload failed',
          variant: "destructive"
        });
      }

      return result;
    } finally {
      setUploading(false);
    }
  }, [toast, options]);

  const uploadAllFiles = useCallback(async (
    uploadOptions: FileUploadOptions = {}
  ): Promise<FileUploadResult[]> => {
    setUploading(true);

    const results: FileUploadResult[] = [];

    for (const fileWithPreview of files) {
      if (fileWithPreview.error) continue;

      const result = await uploadFile(fileWithPreview.file, uploadOptions);
      results.push(result);

      if (result.success && result.data) {
        setFiles(prev => prev.map(f =>
          f.file === fileWithPreview.file
            ? { ...f, key: result.data!.key, url: result.data!.cdnUrl }
            : f
        ));
      }
    }

    setUploading(false);

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    if (successCount > 0) {
      toast({
        title: "Upload Complete",
        description: `${successCount} files uploaded successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
      });
    }

    if (failCount > 0 && successCount === 0) {
      toast({
        title: "Upload Failed",
        description: "All uploads failed",
        variant: "destructive"
      });
    }

    return results;
  }, [files, toast]);

  const deleteSingleFile = useCallback(async (key: string): Promise<FileDeleteResult> => {
    setDeleting(key);

    try {
      const result = await deleteFile(key);

      if (result.success) {
        // Remove from files list
        setFiles(prev => prev.filter(f => f.key !== key));

        options.onDeleteSuccess?.(key);

        toast({
          title: "File Deleted",
          description: "File deleted successfully",
        });
      } else {
        options.onDeleteError?.(result.error || 'Delete failed');

        toast({
          title: "Delete Failed",
          description: result.error || 'Delete failed',
          variant: "destructive"
        });
      }

      return result;
    } finally {
      setDeleting(null);
    }
  }, [toast, options]);

  const getFileDownloadUrl = useCallback(async (
    key: string,
    useCDN: boolean = true
  ): Promise<FileDownloadResult> => {
    return await getFileUrl(key, useCDN);
  }, []);

  return {
    files,
    uploading,
    deleting,
    addFiles,
    removeFile,
    clearFiles,
    uploadSingleFile,
    uploadAllFiles,
    deleteSingleFile,
    getFileDownloadUrl,
    formatFileSize,
    getFileTypeCategory,
  };
}

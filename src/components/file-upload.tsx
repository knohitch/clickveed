'use client';

import React, { useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, File, Image as ImageIcon, Video, Music, FileText } from 'lucide-react';
import { useFileUpload } from '@/hooks/use-file-upload';
import { formatFileSize, getFileTypeCategory } from '@/lib/file-upload';
import Image from 'next/image';

interface FileUploadProps {
  onUploadComplete?: (files: Array<{ key: string; url: string; fileName: string }>) => void;
  maxFiles?: number;
  acceptedFileTypes?: string;
  className?: string;
}

const FileTypeIcon = ({ type }: { type: string }) => {
  const category = getFileTypeCategory(type);

  switch (category) {
    case 'image':
      return <ImageIcon className="h-8 w-8 text-blue-500" />;
    case 'video':
      return <Video className="h-8 w-8 text-purple-500" />;
    case 'audio':
      return <Music className="h-8 w-8 text-green-500" />;
    case 'document':
      return <FileText className="h-8 w-8 text-red-500" />;
    default:
      return <File className="h-8 w-8 text-gray-500" />;
  }
};

export function FileUpload({
  onUploadComplete,
  maxFiles = 10,
  acceptedFileTypes = "image/*,video/*,audio/*,.pdf",
  className = ""
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    files,
    uploading,
    addFiles,
    removeFile,
    uploadAllFiles,
    formatFileSize,
    getFileTypeCategory
  } = useFileUpload({
    onUploadSuccess: (result) => {
      if (result.data && onUploadComplete) {
        onUploadComplete([{
          key: result.data.key,
          url: result.data.cdnUrl,
          fileName: result.data.key.split('/').pop() || 'Unknown'
        }]);
      }
    }
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles);
    }
  }, [addFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      addFiles(Array.from(selectedFiles));
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [addFiles]);

  const handleUpload = useCallback(async () => {
    if (files.length === 0) return;

    await uploadAllFiles();

    // Clear files after upload
    files.forEach((_, index) => removeFile(index));
  }, [files, uploadAllFiles, removeFile]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <Card>
        <CardContent className="p-6">
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              Drop files here or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Supports images, videos, audio files, and PDFs (max 50MB each)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={acceptedFileTypes}
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Selected Files ({files.length})</h3>
                <Button
                  onClick={handleUpload}
                  disabled={uploading || files.length === 0}
                  size="sm"
                >
                  {uploading ? 'Uploading...' : `Upload ${files.length} Files`}
                </Button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {files.map((fileWithPreview, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-shrink-0">
                      {fileWithPreview.preview ? (
                        <Image
                          src={fileWithPreview.preview}
                          alt={fileWithPreview.file.name}
                          width={32}
                          height={32}
                          className="rounded object-cover"
                        />
                      ) : (
                        <FileTypeIcon type={fileWithPreview.file.type} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {fileWithPreview.file.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(fileWithPreview.file.size)}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

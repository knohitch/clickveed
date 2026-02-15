"use client";

import { useRef, useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { removeImageBackgroundAction } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Image as ImageIcon, Sparkles, UploadCloud, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';

const initialState = {
  message: '',
  image: null,
  errors: {},
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} className="w-full">
      {pending ? <Sparkles className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
      {pending ? 'Processing...' : 'Remove Background'}
    </Button>
  );
}

export function BackgroundRemover() {
  const [state, formAction] = useFormState(removeImageBackgroundAction, initialState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);

  const handleReset = () => {
    setOriginalImage(null);
    setProcessedImage(null);
    setPublicUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    formRef.current?.reset();
    // This is a way to reset the action state itself
    formAction(new FormData());
  }

  useEffect(() => {
    if (state.message === 'success' && state.image) {
      setProcessedImage(state.image);
      toast({ title: 'Success', description: 'Background removed successfully.' });
    } else if (state.message && state.message !== 'success' && state.message !== 'Validation failed') {
      toast({
        variant: "destructive",
        title: "Error",
        description: state.message,
      });
    }
  }, [state, toast]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProcessedImage(null);
      setPublicUrl(null);

      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImage(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Secure upload
      setIsUploading(true);
      try {
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        });
        if (!response.ok) throw new Error("Failed to upload file");
        const { url: newPublicUrl } = await response.json();

        setPublicUrl(newPublicUrl);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload the image.' });
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set('imageUrl', publicUrl || '');
    formAction(formData);
  }


  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <input type="hidden" name="imageUrl" value={publicUrl || ""} />
      <Card>
        <CardContent className="p-6">
          {!originalImage ? (
            <div
              className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted"
              onClick={triggerFileSelect}
            >
              <UploadCloud className="w-12 h-12 mb-3 text-muted-foreground" />
              <p className="mb-2 text-sm text-center text-muted-foreground">
                <span className="font-semibold">Click to upload image</span>
              </p>
              <p className="text-xs text-muted-foreground">PNG or JPG</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-center">
              <div className="lg:col-span-5 relative">
                <Image src={originalImage} alt="Original image" width={500} height={500} className="rounded-md aspect-square object-contain border bg-muted" />
                <div className="absolute top-2 left-2 bg-black/50 text-primary-foreground text-xs px-2 py-1 rounded-full">Original</div>
                {isUploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-md">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  </div>
                )}
              </div>

              <div className="lg:col-span-2 flex items-center justify-center">
                <ArrowRight className="h-8 w-8 text-muted-foreground hidden lg:block" />
              </div>

              <div className="lg:col-span-5 relative">
                <div className="w-full aspect-square rounded-md" />
                {processedImage ? (
                  <Image src={processedImage} alt="Processed image" width={500} height={500} className="rounded-md aspect-square object-contain border" />
                ) : (
                  <div className="w-full aspect-square rounded-md border-2 border-dashed bg-muted flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute top-2 left-2 bg-black/50 text-primary-foreground text-xs px-2 py-1 rounded-full">Result</div>
              </div>
            </div>
          )}
          <Input
            id="image"
            name="image-file-input" // Changed name to avoid conflict with hidden input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
            accept="image/png,image/jpeg"
            key={originalImage || ''}
          />
        </CardContent>
      </Card>

      <div className="flex gap-2 mt-4">
        <SubmitButton disabled={!publicUrl || isUploading} />
        {processedImage && (
          <Button variant="secondary" asChild>
            <a href={processedImage} download="background-removed.png">
              <Download className="mr-2 h-4 w-4" />
              Download
            </a>
          </Button>
        )}
        {(originalImage || processedImage) && (
          <Button variant="outline" type="button" onClick={handleReset}>
            <Trash2 className="mr-2 h-4 w-4" />
            Reset
          </Button>
        )}
      </div>

      {'imageUrl' in (state.errors || {}) && <p className="text-sm text-destructive mt-2">{(state.errors as any)?.imageUrl?.[0]}</p>}
    </form>
  );
}
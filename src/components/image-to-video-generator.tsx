
"use client";

import { useRef, useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { generateVideoAction } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bot, Download, Image as ImageIcon, Clapperboard, Music, Sparkles, UploadCloud, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface FormState {
  message: string;
  videoUrl?: string | null;
  audioUrl?: string | null;
  errors: {
    imageUrl?: string[] | undefined;
    musicPrompt?: string[] | undefined;
    videoDescription?: string[] | undefined;
  } | Record<string, string[] | undefined>;
}

const initialState: FormState = {
  message: '',
  videoUrl: null,
  audioUrl: null,
  errors: {},
};

function GeneratorUI({ videoUrl, audioUrl }: { videoUrl: string | null, audioUrl: string | null}) {

    return (
        <div className='space-y-6'>
            <Card>
                <CardHeader>
                    <CardTitle className="flex justify-between items-center text-lg">
                        <div className='flex items-center gap-2'>
                            <Clapperboard className="h-5 w-5" />
                            Generated Video
                        </div>
                        {videoUrl && (
                            <Button variant="ghost" size="icon" asChild>
                                <a href={videoUrl} download="generated-video.mp4">
                                    <Download className="h-4 w-4" />
                                </a>
                            </Button>
                        )}
                    </CardTitle>
                    <CardDescription>This is the generated video content.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                    <Skeleton className="w-full aspect-video rounded-md" />
                    { videoUrl ? (
                         <video
                            src={videoUrl}
                            controls
                            className="rounded-md object-cover aspect-video w-full bg-muted"
                          >
                            Your browser does not support the video tag.
                          </video>
                    ) : (
                        <div className="text-sm text-muted-foreground text-center p-8 border-2 border-dashed rounded-md w-full aspect-video flex flex-col justify-center items-center">
                            <Clapperboard className="h-10 w-10 mx-auto text-muted-foreground" />
                            <p className="mt-2">Your generated video will appear here.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex justify-between items-center text-lg">
                        <div className='flex items-center gap-2'>
                            <Music className="h-5 w-5" />
                            Generated Audio
                        </div>
                        {audioUrl && (
                            <Button variant="ghost" size="icon" asChild>
                                <a href={audioUrl} download="generated-audio.wav">
                                    <Download className="h-4 w-4" />
                                </a>
                            </Button>
                        )}
                    </CardTitle>
                    <CardDescription>This is the generated voiceover track.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Skeleton className="w-full h-12 rounded-md" />
                    { audioUrl ? (
                        <audio src={audioUrl} controls className="w-full" />
                    ) : (
                        <div className="text-sm text-muted-foreground text-center p-4 border-2 border-dashed rounded-md w-full flex flex-col justify-center items-center">
                            <p className="mt-2">Your generated audio will appear here.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

export function ImageToVideoGenerator() {
  const [state, formAction] = useFormState(generateVideoAction, initialState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  
  const resetForm = () => {
    formRef.current?.reset();
    if(fileInputRef.current) fileInputRef.current.value = "";
    setPreview(null);
    setPublicUrl(null);
  }

  const handleFormSubmit = (formData: FormData) => {
    formData.set('imageUrl', publicUrl || '');
    formAction(formData);
  }

  useEffect(() => {
    if (state.message === 'success' && state.videoUrl && state.audioUrl) {
      setVideoUrl(state.videoUrl);
      setAudioUrl(state.audioUrl);
      toast({ title: 'Success', description: 'Video and audio generated.' });
      resetForm();
    } else if (state.message && state.message !== 'success' && state.message !== 'Validation failed') {
      toast({
        variant: "destructive",
        title: "Error",
        description: state.message,
      });
    }
  }, [state, toast]);

  const handleFile = async (file: File | null) => {
    if (file && file.type.startsWith('image/')) {
        setVideoUrl(null);
        setAudioUrl(null);
        setPublicUrl(null);

        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        setIsUploading(true);
        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: file.name, contentType: file.type }),
            });
            if (!response.ok) throw new Error("Failed to get upload URL");
            const { publicUrl: newPublicUrl } = await response.json();
            setPublicUrl(newPublicUrl);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload the image.' });
        } finally {
            setIsUploading(false);
        }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }
  
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }
  
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
        handleFile(file);
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-8 items-start">
        <form ref={formRef} action={handleFormSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="image">Upload Image</Label>
                {preview ? (
                <div className="mt-2 rounded-md border p-2 relative w-fit">
                    <Image src={preview} alt="Image preview" width={128} height={128} className="rounded-md object-cover h-32 w-32" />
                    <Button variant="destructive" size="icon" className="absolute -top-3 -right-3 h-7 w-7" onClick={() => resetForm()}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
                ) : (
                <div className="flex items-center justify-center w-full">
                    <label 
                        htmlFor="image" 
                        className={cn("flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted transition-colors", isDragging && "border-primary bg-primary/10")}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                            <p className="mb-2 text-sm text-muted-foreground">
                                <span className="font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-muted-foreground">PNG or JPG</p>
                        </div>
                        <Input id="image" type="file" accept="image/*" required onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                    </label>
                </div>
                )}
                {'imageUrl' in state.errors && state.errors.imageUrl && <p className="text-sm text-destructive">{state.errors.imageUrl[0]}</p>}
            </div>

            <div className="space-y-2 mt-4">
                <Label htmlFor="videoDescription">Video Description</Label>
                <Textarea id="videoDescription" name="videoDescription" placeholder="A cinematic zoom-in on the mountain peak with birds flying by." required />
                {'videoDescription' in state.errors && state.errors.videoDescription && <p className="text-sm text-destructive">{state.errors.videoDescription[0]}</p>}
            </div>
            <div className="space-y-2 mt-4">
                <Label htmlFor="musicPrompt">Music Prompt</Label>
                <Input id="musicPrompt" name="musicPrompt" placeholder="Epic orchestral music, uplifting and adventurous tone" required />
                {'musicPrompt' in state.errors && state.errors.musicPrompt && <p className="text-sm text-destructive">{state.errors.musicPrompt[0]}</p>}
            </div>
            <div className="mt-4">
                <Button type="submit" disabled={isUploading || !publicUrl} className="w-full">
                    <Bot className="mr-2 h-4 w-4" />
                    Generate Video & Audio
                </Button>
                 {isUploading && (
                    <div className="flex items-center text-sm text-muted-foreground mt-2">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading image...
                    </div>
                )}
            </div>
            <div className="md:hidden mt-8">
              <GeneratorUI videoUrl={videoUrl} audioUrl={audioUrl}/>
            </div>
        </form>
      <div className="sticky top-8 hidden md:block">
        <GeneratorUI videoUrl={videoUrl} audioUrl={audioUrl} />
      </div>
    </div>
  );
}

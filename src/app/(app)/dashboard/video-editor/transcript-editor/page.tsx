

'use client';

import { useState, useRef, useEffect, useTransition, useCallback } from 'react';
import { useFormState } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, Sparkles, FilePenLine, Play, Pause, AlertCircle, Loader2, RotateCcw } from 'lucide-react';
import { generateTimedTranscriptAction } from '@/lib/actions';
import type { TimedWord } from '@/server/ai/flows/generate-timed-transcript';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const initialState = {
  message: '',
  transcript: null,
  errors: {},
};

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function SubmitButton({ disabled, isUploading, isPending }: { disabled: boolean, isUploading: boolean, isPending: boolean }) {
  const isDisabled = disabled || isUploading || isPending;
  return (
    <Button type="submit" disabled={isDisabled} className="w-full">
      {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isPending ? <Sparkles className="mr-2 h-4 w-4 animate-spin" /> : <FilePenLine className="mr-2 h-4 w-4" />}
      {isUploading ? 'Uploading...' : isPending ? 'Transcribing...' : 'Generate Transcript'}
    </Button>
  );
}

const TranscriptWord = ({ word, isActive, onClick }: { word: TimedWord, isActive: boolean, onClick: () => void }) => {
    return (
        <span 
            onClick={onClick}
            className={cn(
                "cursor-pointer rounded-md transition-colors px-0.5",
                isActive ? "bg-primary/30" : "hover:bg-muted"
            )}
        >
            {word.word}{' '}
        </span>
    )
}

export default function TranscriptEditorPage() {
    const { toast } = useToast();
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const [timedTranscript, setTimedTranscript] = useState<TimedWord[]>([]);
    const [activeWordIndex, setActiveWordIndex] = useState(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    
    const [isUploading, setIsUploading] = useState(false);
    const [state, formAction] = useFormState(generateTimedTranscriptAction, initialState);
    
    const [watchProgress, setWatchProgress] = useState<number>(0);
    const [hasSavedProgress, setHasSavedProgress] = useState(false);
    const progressSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (state.message === 'success' && state.transcript) {
            setTimedTranscript(state.transcript);
            toast({ title: "Transcription Complete", description: "You can now edit the video by editing the text." });
        } else if (state.message && state.message !== 'Validation failed' && state.message) {
            toast({ variant: 'destructive', title: "Error", description: state.message });
        }
    }, [state, toast]);

    useEffect(() => {
        return () => {
            if (previewVideoUrl) {
                URL.revokeObjectURL(previewVideoUrl);
            }
        };
    }, [previewVideoUrl]);

    useEffect(() => {
        if (videoFile && typeof window !== 'undefined') {
            const storageKey = `video-progress-${videoFile.name}-${videoFile.size}`;
            const savedProgress = localStorage.getItem(storageKey);
            if (savedProgress) {
                const progress = parseFloat(savedProgress);
                setWatchProgress(progress);
                setHasSavedProgress(true);
            } else {
                setWatchProgress(0);
                setHasSavedProgress(false);
            }
        }
    }, [videoFile]);

    useEffect(() => {
        if (videoRef.current && videoFile && previewVideoUrl) {
            const video = videoRef.current;
            
            const handleLoadedMetadata = () => {
                if (watchProgress > 0 && watchProgress < video.duration) {
                    video.currentTime = watchProgress;
                    toast({ 
                        title: "Progress Restored", 
                        description: `Resuming from ${formatTime(watchProgress)}` 
                    });
                }
            };

            video.addEventListener('loadedmetadata', handleLoadedMetadata);
            
            return () => {
                video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            };
        }
    }, [previewVideoUrl, watchProgress, toast]);

    const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!videoFile) return;

        setIsUploading(true);
        toast({ title: "Uploading video...", description: "Please wait while your file is uploaded." });

        try {
            // Create FormData to upload the actual file
            const uploadFormData = new FormData();
            uploadFormData.append('file', videoFile);
            
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: uploadFormData, // Don't set Content-Type - browser will add multipart boundary
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to upload video.');
            }
            
            const { success, url } = await response.json();
            
            if (!success || !url) {
                throw new Error('Upload failed - no URL returned');
            }
            
            setIsUploading(false);
            toast({ title: "Upload Complete!", description: "Now generating transcript..." });

            const formData = new FormData();
            formData.set('videoUrl', url);
            
            formAction(formData);

        } catch (error) {
            setIsUploading(false);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            toast({ variant: 'destructive', title: 'Upload Failed', description: errorMessage });
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setVideoFile(file);
            setPreviewVideoUrl(URL.createObjectURL(file));
            setTimedTranscript([]);
        }
    };
    
    const handleTimeUpdate = () => {
        if (!videoRef.current || !videoFile) return;
        const currentTime = videoRef.current.currentTime;
        
        const newIndex = timedTranscript.findIndex(word => currentTime >= word.start && currentTime <= word.end);
        if (newIndex !== -1 && newIndex !== activeWordIndex) {
            setActiveWordIndex(newIndex);
        }
        
        setWatchProgress(currentTime);
        
        if (progressSaveTimeoutRef.current) {
            clearTimeout(progressSaveTimeoutRef.current);
        }
        
        progressSaveTimeoutRef.current = setTimeout(() => {
            if (videoFile && typeof window !== 'undefined') {
                const storageKey = `video-progress-${videoFile.name}-${videoFile.size}`;
                localStorage.setItem(storageKey, currentTime.toString());
            }
        }, 1000);
    }
    
    const handleResetProgress = () => {
        if (!videoFile) return;
        
        if (typeof window !== 'undefined') {
            const storageKey = `video-progress-${videoFile.name}-${videoFile.size}`;
            localStorage.removeItem(storageKey);
        }
        setWatchProgress(0);
        setHasSavedProgress(false);
        
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
        }
        
        toast({ title: "Progress Reset", description: "Video progress has been cleared." });
    }

    const handleWordClick = (word: TimedWord) => {
        if (videoRef.current) {
            videoRef.current.currentTime = word.start;
        }
    }
    
    const handlePlayPause = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
        }
    };

    return (
        <div className="grid lg:grid-cols-12 gap-6 items-start h-full">
            <div className="lg:col-span-8 space-y-6">
                 <Card>
                    <CardHeader>
                         <CardTitle className="flex justify-between items-center">
                            Video Preview
                            {previewVideoUrl && (
                                <div className="flex items-center gap-2">
                                    {hasSavedProgress && (
                                        <Badge variant="secondary" className="text-xs">
                                            Resuming from {formatTime(watchProgress)}
                                        </Badge>
                                    )}
                                    <Button size="icon" variant="outline" onClick={handlePlayPause}>
                                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                    </Button>
                                    {hasSavedProgress && (
                                        <Button size="icon" variant="ghost" onClick={handleResetProgress} title="Reset progress">
                                            <RotateCcw className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            )}
                         </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                            {previewVideoUrl ? (
                                <video 
                                    ref={videoRef}
                                    src={previewVideoUrl}
                                    className="w-full h-full object-contain"
                                    onTimeUpdate={handleTimeUpdate}
                                    onPlay={() => setIsPlaying(true)}
                                    onPause={() => setIsPlaying(false)}
                                >
                                    Your browser does not support the video tag.
                                </video>
                            ) : (
                                <p className="text-muted-foreground">Upload a video to begin</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Transcript Editor</CardTitle>
                        <CardDescription>Click on a word to jump to that point in the video. Delete text to trim the video (feature coming soon).</CardDescription>
                    </CardHeader>
                    <CardContent className="h-96">
                        <div className="p-4 border rounded-md h-full overflow-y-auto" contentEditable={timedTranscript.length > 0} suppressContentEditableWarning={true}>
                             <div className="space-y-3">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-[90%]" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-[85%]" />
                                </div>
                            { timedTranscript.length > 0 ? (
                                <p className="text-lg leading-relaxed">
                                    {timedTranscript.map((word, index) => (
                                        <TranscriptWord 
                                            key={index}
                                            word={word}
                                            isActive={index === activeWordIndex}
                                            onClick={() => handleWordClick(word)}
                                        />
                                    ))}
                                </p>
                            ) : (
                                <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                                    <p>Your generated transcript will appear here.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

            </div>

             <div className="lg:col-span-4 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Controls</CardTitle>
                    </CardHeader>
                     <CardContent>
                        <form onSubmit={handleFormSubmit}>
                             <label htmlFor="video-upload" className="flex flex-col items-center justify-center w-full p-4 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted mb-4">
                                <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                                <span className="font-semibold text-sm">Upload Video File</span>
                                <span className="text-xs text-muted-foreground">{videoFile?.name || "MP4, MOV up to 1GB"}</span>
                            </label>
                            <input id="video-upload" name="video" type="file" className="hidden" accept="video/*" onChange={handleFileChange} />
                            
                            <SubmitButton disabled={!videoFile} isUploading={isUploading} isPending={false} />
                        </form>
                    </CardContent>
                </Card>
                 {timedTranscript.length > 0 && (
                    <Card className="border-primary">
                        <CardHeader>
                            <CardTitle className="text-primary flex items-center gap-2">
                                <AlertCircle className="h-5 w-5" />
                                Next Steps
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Editing the text will trim the video. Once you are happy with the transcript, you can proceed to add B-Roll and captions.
                            </p>
                            <Button className="w-full" asChild>
                                <Link href="/dashboard/video-editor">
                                    Finalize in Timeline Editor
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

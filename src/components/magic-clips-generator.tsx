

"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, Film, PlayCircle, Scissors, TrendingUp, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { Badge } from './ui/badge';
import { createVideoWithTranscript } from '@/server/actions/video-actions';
import { findViralClips } from '@/lib/actions';

interface Clip {
    id: number;
    title: string;
    startTime: number;
    endTime: number;
    reason: string;
    score: number;
}

export function MagicClipsGenerator() {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [clips, setClips] = useState<Clip[]>([]);
    const [isTranscribing, startTranscriptionTransition] = useTransition();
    const [isAnalyzing, startAnalysisTransition] = useTransition();

    const isProcessing = isTranscribing || isAnalyzing;
  
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setVideoFile(file);
        setClips([]);
    }
    
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!videoFile) {
            toast({ variant: 'destructive', title: 'No Video Selected', description: 'Please upload a video file first.' });
            return;
        }

        startTranscriptionTransition(async () => {
            try {
                toast({ title: "Uploading & Transcribing...", description: "This may take a few moments." });
                const { id } = await createVideoWithTranscript(videoFile);
                toast({ title: "Transcription Complete!", description: "Now analyzing for viral clips..." });

                startAnalysisTransition(async () => {
                    const result = await findViralClips({ videoId: id });
                    setClips(result.clips);
                    toast({ title: 'Analysis Complete!', description: `Found ${result.clips.length} potential viral clips.` });
                });

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
                toast({ variant: 'destructive', title: 'Processing Failed', description: errorMessage });
            }
        });
    }

    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label htmlFor="video-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                            <span className="font-semibold text-sm">{videoFile ? videoFile.name : "Click to upload a video"}</span>
                            <p className="text-xs text-muted-foreground">MP4, MOV up to 1GB</p>
                        </div>
                        <Input 
                            id="video-upload"
                            name="video"
                            type="file" 
                            className="hidden" 
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="video/*"
                        />
                    </label>
                </div>
                <Button type="submit" disabled={!videoFile || isProcessing} className="w-full">
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Scissors className="mr-2 h-4 w-4" />}
                    {isTranscribing ? 'Transcribing...' : (isAnalyzing ? 'Analyzing...' : 'Find Viral Clips')}
                </Button>
            </form>

            <div className="space-y-4">
                {isProcessing ? (
                    Array(3).fill(0).map((_, i) => (
                        <Card key={i}>
                            <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                            <CardContent className="space-y-3">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-5/6" />
                            </CardContent>
                        </Card>
                    ))
                ) : clips.length > 0 ? (
                    clips.map((clip) => (
                        <Card key={clip.id}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg">{clip.title}</CardTitle>
                                    <Badge variant={clip.score > 85 ? 'default' : 'secondary'} className="flex-shrink-0">
                                        <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                                        {clip.score} / 100
                                    </Badge>
                                </div>
                                <CardDescription>{clip.reason}</CardDescription>
                            </CardHeader>
                            <CardFooter className="flex justify-between items-center">
                                <div className="text-sm font-mono text-muted-foreground">
                                    {new Date(clip.startTime * 1000).toISOString().substr(14, 5)} - {new Date(clip.endTime * 1000).toISOString().substr(14, 5)}
                                </div>
                                <Button variant="secondary" size="sm">
                                    <PlayCircle className="mr-2 h-4 w-4" /> Preview
                                </Button>
                            </CardFooter>
                        </Card>
                    ))
                ) : (
                    <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-md">
                        <Film className="h-12 w-12 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold">Generated Clips Will Appear Here</h3>
                        <p>Upload a video to let the AI find the best moments.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

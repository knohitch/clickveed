

"use client";

import { useRef, useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { generatePersonaAvatarAction } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Download, Sparkles, UserSquare, Video, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import Image from 'next/image';

type Errors = {
    personaName?: string[];
    personaDescription?: string[];
    avatarDescription?: string[];
    script?: string[];
};

type State = {
    message: string;
    avatarImageUrl: string | null;
    jobId: string | null;
    jobStatus: 'queued' | 'processing' | 'completed' | 'failed' | null;
    videoStatus: string | null;
    videoUrl: string | null;
    errors: Errors | {};
};

const initialState: State = {
    message: '',
    avatarImageUrl: null,
    jobId: null,
    jobStatus: null,
    videoStatus: null,
    videoUrl: null,
    errors: {}
};

// Helper function to safely access error properties
function getError(state: State, field: keyof Errors): string | undefined {
    if (state.errors && typeof state.errors === 'object' && field in state.errors) {
        const errors = (state.errors as Errors)[field];
        return errors && errors.length > 0 ? errors[0] : undefined;
    }
    return undefined;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Sparkles className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
      {pending ? 'Generating...' : 'Generate Avatar'}
    </Button>
  );
}

function AvatarDisplay({
    imageUrl,
    videoStatus,
    videoUrl,
    pending
}: {
    imageUrl: string | null,
    videoStatus: string | null,
    videoUrl: string | null,
    pending: boolean
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    Generated Avatar
                    {imageUrl && !pending && (
                        <Button variant="ghost" size="icon" asChild>
                            <a href={imageUrl} download="generated-avatar-image.png">
                                <Download className="h-4 w-4" />
                            </a>
                        </Button>
                    )}
                </CardTitle>
                <CardDescription>The image appears first, then the video job is tracked until it finishes or fails.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
                {pending ? (
                    <div className="flex flex-col items-center justify-center w-full aspect-square">
                        <Skeleton className="h-full w-full rounded-md" />
                    </div>
                ) : imageUrl ? (
                     <div className="space-y-4 w-full">
                        <Image src={imageUrl} alt="Generated Avatar" width={400} height={400} className="rounded-md object-cover aspect-square w-full bg-muted" data-ai-hint="avatar user" />
                         {videoStatus && (
                            <div className="flex items-center gap-3 p-3 rounded-md bg-muted text-muted-foreground">
                                <Loader2 className={`h-5 w-5 flex-shrink-0 ${videoUrl ? '' : 'animate-spin'}`} />
                                <p className="text-sm">{videoStatus}</p>
                            </div>
                         )}
                         {videoUrl && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <Video className="h-4 w-4" />
                                    Generated Avatar Video
                                </div>
                                <video controls className="w-full rounded-md bg-black" src={videoUrl}>
                                    Your browser does not support the video tag.
                                </video>
                            </div>
                         )}
                     </div>
                ) : (
                    <div className="text-sm text-muted-foreground text-center p-8 border-2 border-dashed rounded-md w-full aspect-square flex flex-col justify-center items-center">
                        <UserSquare className="h-12 w-12 mx-auto text-muted-foreground" data-ai-hint="avatar user" />
                        <p className="mt-4">Your generated avatar will appear here.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export function PersonaAvatarStudio() {
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);
    const [state, formAction] = useFormState(generatePersonaAvatarAction, initialState);
    const [currentJob, setCurrentJob] = useState({
        jobId: null as string | null,
        jobStatus: null as State['jobStatus'],
        videoStatus: null as string | null,
        videoUrl: null as string | null,
        errorMessage: null as string | null,
    });
    const lastTerminalToastRef = useRef<string | null>(null);

    const handleFormSubmit = (formData: FormData) => {
        formAction(formData);
    };

    useEffect(() => {
        if (state.message === 'success' && state.avatarImageUrl) {
            setCurrentJob({
                jobId: state.jobId,
                jobStatus: state.jobStatus,
                videoStatus: state.videoStatus,
                videoUrl: state.videoUrl,
                errorMessage: null,
            });
            toast({ title: 'Avatar Image Generated!', description: state.videoStatus || "Video generation started." });
        } else if (state.message && state.message !== 'success' && state.message !== 'Validation failed') {
            toast({
                variant: "destructive",
                title: "Error Generating Avatar",
                description: state.message,
            });
        }
    }, [state, toast]);

    useEffect(() => {
        if (!currentJob.jobId || !currentJob.jobStatus) return;
        if (currentJob.jobStatus === 'completed' || currentJob.jobStatus === 'failed') return;

        let cancelled = false;

        const pollJob = async () => {
            try {
                const response = await fetch(`/api/persona-avatar-jobs/${currentJob.jobId}`, { cache: 'no-store' });
                if (!response.ok) {
                    return;
                }

                const payload = await response.json();
                if (!payload?.success || !payload?.job || cancelled) {
                    return;
                }

                setCurrentJob({
                    jobId: payload.job.id,
                    jobStatus: payload.job.jobStatus,
                    videoStatus: payload.job.videoStatus,
                    videoUrl: payload.job.videoUrl,
                    errorMessage: payload.job.errorMessage,
                });
            } catch (error) {
                console.warn('Failed to poll persona avatar job status', error);
            }
        };

        pollJob();
        const intervalId = window.setInterval(pollJob, 5000);

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
        };
    }, [currentJob.jobId, currentJob.jobStatus]);

    useEffect(() => {
        if (!currentJob.jobId) return;
        if (lastTerminalToastRef.current === currentJob.jobId) return;

        if (currentJob.jobStatus === 'completed') {
            lastTerminalToastRef.current = currentJob.jobId;
            toast({
                title: 'Avatar Video Ready',
                description: currentJob.videoStatus || 'Your avatar video finished rendering.',
            });
        }

        if (currentJob.jobStatus === 'failed') {
            lastTerminalToastRef.current = currentJob.jobId;
            toast({
                variant: 'destructive',
                title: 'Avatar Video Failed',
                description: currentJob.errorMessage || currentJob.videoStatus || 'The avatar video could not be rendered.',
            });
        }
    }, [currentJob, toast]);
  
    return (
        <div className="grid md:grid-cols-2 gap-8 items-start">
            <form 
                ref={formRef} 
                action={handleFormSubmit}
                className="space-y-6"
            >
                <Card>
                    <CardHeader>
                        <CardTitle>1. Define Persona</CardTitle>
                        <CardDescription>Describe the personality, expertise, and communication style of your AI.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="personaName">Persona Name</Label>
                            <Input id="personaName" name="personaName" placeholder="e.g., 'Eco-Warrior Willow'" required />
                            {getError(state, 'personaName') && <p className="text-sm text-destructive mt-1">{getError(state, 'personaName')}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="personaDescription">Persona Description</Label>
                            <Textarea id="personaDescription" name="personaDescription" placeholder="A friendly expert in sustainable living, who speaks in a calm, encouraging tone." rows={4} required />
                             {getError(state, 'personaDescription') && <p className="text-sm text-destructive mt-1">{getError(state, 'personaDescription')}</p>}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>2. Generate Avatar</CardTitle>
                        <CardDescription>Describe the visual appearance and provide a script for the avatar to speak.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="avatarDescription">Avatar Visual Description</Label>
                            <Textarea id="avatarDescription" name="avatarDescription" placeholder="A woman in her late 20s with long, flowing brown hair, wearing glasses and a green linen shirt, standing in a lush forest. Photorealistic style." rows={4} required />
                            {getError(state, 'avatarDescription') && <p className="text-sm text-destructive mt-1">{getError(state, 'avatarDescription')}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="script">Spoken Script</Label>
                            <Textarea id="script" name="script" placeholder="Hello everyone! Today, we're going to explore three simple ways you can reduce your carbon footprint at home..." rows={4} required />
                            {getError(state, 'script') && <p className="text-sm text-destructive mt-1">{getError(state, 'script')}</p>}
                        </div>
                        <SubmitButton />
                    </CardContent>
                </Card>
            </form>
            <div className="sticky top-8">
                <AvatarDisplay
                    imageUrl={state.avatarImageUrl}
                    videoStatus={currentJob.videoStatus || state.videoStatus}
                    videoUrl={currentJob.videoUrl || state.videoUrl}
                    pending={false}
                />
            </div>
        </div>
    );
}

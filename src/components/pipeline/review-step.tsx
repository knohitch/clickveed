
"use client";

import { useState } from "react";
import { useFormStatus } from 'react-dom';
import { useFormState } from 'react-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Download, FileText, Mic, Video, Share2, Send, Sparkles } from "lucide-react";
import { shareVideoToSocialsAction } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { 
    Facebook,
    Instagram,
    Youtube,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "../ui/label";

// A placeholder for a TikTok icon
const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-2.43.05-4.84-.95-6.6-2.73-1.75-1.78-2.55-4.16-2.4-6.6.14-2.44 1.11-4.75 2.87-6.36 1.75-1.62 4.06-2.43 6.42-2.29.02 1.52.02 3.04.01 4.56-.52-.01-1.04.04-1.56.04-1.29 0-2.54.49-3.47 1.44-.92.95-1.39 2.22-1.38 3.54.02 1.37.47 2.68 1.44 3.63.97.96 2.29 1.41 3.63 1.41.02 0 .02 0 .03 0 .86 0 1.69-.21 2.44-.6.81-.39 1.49-.96 1.99-1.66.44-.6.75-1.32.92-2.09.13-.6.18-1.22.2-1.84.02-3.33.01-6.67 0-10.01z" />
    </svg>
);

const socialPlatforms = [
    { id: 'instagram', name: 'Instagram', icon: Instagram, connected: true },
    { id: 'youtube', name: 'YouTube', icon: Youtube, connected: true },
    { id: 'tiktok', name: 'TikTok', icon: TikTokIcon, connected: true },
    { id: 'facebook', name: 'Facebook', icon: Facebook, connected: false },
] as const;

type PlatformId = typeof socialPlatforms[number]['id'];

interface ReviewStepProps {
    script: string | null;
    audioUrl: string | null;
    videoUrl: string | null;
}

const socialShareInitialState = {
    message: '',
    errors: {}
}

function ShareButton({ disabled }: { disabled: boolean }) {
    const { pending } = useFormStatus();
    return (
        <Button className="w-full" type="submit" disabled={pending || disabled}>
             {pending ? <Sparkles className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
             {pending ? 'Publishing...' : 'Publish to Socials'}
        </Button>
    )
}

export function ReviewStep({ script, audioUrl, videoUrl }: ReviewStepProps) {
    const [state, formAction] = useFormState(shareVideoToSocialsAction, socialShareInitialState);
    const { toast } = useToast();
    const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformId[]>([]);
    
    React.useEffect(() => {
        if (state.message === 'success') {
            toast({
                title: 'Successfully Published!',
                description: 'Your video has been posted to the selected platforms.',
            });
        } else if (state.message) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: state.message,
            })
        }
    }, [state, toast]);


    const handleDownload = (dataUri: string, filename: string) => {
        if (!dataUri) return;
        const a = document.createElement('a');
        a.href = dataUri;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

     const downloadScript = () => {
        if (script) {
            const blob = new Blob([script], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            handleDownload(url, 'script.txt');
            URL.revokeObjectURL(url);
        }
    };

    const handlePlatformToggle = (platformId: PlatformId) => {
        setSelectedPlatforms(prev =>
            prev.includes(platformId)
                ? prev.filter(id => id !== platformId)
                : [...prev, platformId]
        );
    };

    return (
        <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Video className="h-5 w-5" />
                                Final Video
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleDownload(videoUrl!, 'video.mp4')} 
                                disabled={!videoUrl}
                            >
                                <Download className="mr-2 h-4 w-4" /> Download Video
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {videoUrl ? (
                             <video
                                key={videoUrl}
                                src={videoUrl}
                                controls
                                className="rounded-md object-cover aspect-video w-full bg-muted"
                            >
                                Your browser does not support the video tag.
                            </video>
                        ) : (
                            <p className="text-muted-foreground text-sm">Video not generated yet.</p>
                        )}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                         <CardTitle className="flex justify-between items-center">
                             <div className="flex items-center gap-2">
                                <Mic className="h-5 w-5" />
                                Voice Over
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleDownload(audioUrl!, 'voiceover.wav')}
                                disabled={!audioUrl}
                            >
                                <Download className="mr-2 h-4 w-4" /> Download Audio
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                       {audioUrl ? (
                            <audio src={audioUrl} controls className="w-full" />
                        ) : (
                            <p className="text-muted-foreground text-sm">Audio not generated yet.</p>
                        )}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Final Script
                            </div>
                             <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={downloadScript}
                                disabled={!script}
                            >
                                <Download className="mr-2 h-4 w-4" /> Download Script
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Textarea value={script || "Script not generated yet."} readOnly className="h-48 bg-muted" />
                    </CardContent>
                </Card>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Share2 className="h-5 w-5" />
                        Share to Socials
                    </CardTitle>
                    <CardDescription>Publish your video directly to your connected accounts.</CardDescription>
                </CardHeader>
                <CardContent>
                   <form action={formAction} className="space-y-4">
                        <input type="hidden" name="videoUrl" value={videoUrl || ''} />
                        <input type="hidden" name="platforms" value={selectedPlatforms.join(',')} />
                        <div className="space-y-2">
                            <Label htmlFor="caption">Caption</Label>
                            <Textarea id="caption" name="caption" placeholder="Write a caption for your post..." rows={5} required/>
                            {state.errors?.caption && <p className="text-sm text-destructive">{state.errors.caption as string}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Publish to</Label>
                            <div className="flex flex-wrap gap-2">
                                {socialPlatforms.map(platform => (
                                    <button
                                        key={platform.id}
                                        type="button"
                                        onClick={() => platform.connected && handlePlatformToggle(platform.id)}
                                        disabled={!platform.connected}
                                        className={cn(
                                            "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all",
                                            selectedPlatforms.includes(platform.id) ? "bg-primary text-primary-foreground border-primary" : "bg-transparent",
                                            platform.connected ? "cursor-pointer hover:bg-muted" : "cursor-not-allowed opacity-50"
                                        )}
                                    >
                                        <platform.icon className="h-4 w-4" />
                                        {platform.name}
                                    </button>
                                ))}
                            </div>
                             {state.errors?.platforms && <p className="text-sm text-destructive mt-2">{state.errors.platforms as string}</p>}
                        </div>
                        <ShareButton disabled={selectedPlatforms.length === 0 || !videoUrl} />
                   </form>
                </CardContent>
            </Card>
        </div>
    );
}

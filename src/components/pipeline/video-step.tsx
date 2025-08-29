

"use client";

import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Video, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { generatePipelineVideoAction } from '@/lib/actions';
import { Textarea } from '../ui/textarea';

const initialState = {
  message: '',
  video: null,
  errors: {},
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Sparkles className="mr-2 h-4 w-4 animate-spin" /> : <Video className="mr-2 h-4 w-4" />}
      Generate Video
    </Button>
  );
}

interface VideoStepProps {
    script: string;
    onVideoGenerated: (videoDataUri: string) => void;
}

export function VideoStep({ script, onVideoGenerated }: VideoStepProps) {
  const [state, formAction] = useFormState(generatePipelineVideoAction, initialState);
  const { toast } = useToast();
  const [video, setVideo] = useState<string | null>(null);
  const { pending } = useFormStatus();


  useEffect(() => {
    if (state.message === 'success' && state.video) {
      setVideo(state.video);
      onVideoGenerated(state.video);
      toast({ title: 'Video Generated!', description: 'You can now proceed to the final step.' });
    } else if (state.message && state.message !== 'success' && state.message !== 'Validation failed') {
      toast({
        variant: "destructive",
        title: "Error Generating Video",
        description: state.message,
      });
    }
  }, [state, toast, onVideoGenerated]);

  return (
    <div className="grid md:grid-cols-2 gap-8 items-start">
        <div className="space-y-4">
             <Card>
                <CardHeader>
                    <CardTitle>Generated Script</CardTitle>
                </CardHeader>
                <CardContent>
                    <Textarea value={script} readOnly rows={10} className="bg-muted" />
                </CardContent>
            </Card>

            <form action={formAction} className="space-y-4">
                <input type="hidden" name="script" value={script} />
                <SubmitButton />
            </form>
        </div>
        
        <div className="sticky top-8">
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                    Generated Video
                    {video && !pending && (
                        <Button variant="ghost" size="icon" asChild>
                            <a href={video} download="pipeline-video.mp4">
                                <Download className="h-4 w-4" />
                            </a>
                        </Button>
                    )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-full">
                    {pending ? (
                        <div className="w-full space-y-2">
                           <Skeleton className="w-full aspect-video rounded-md" />
                        </div>
                    ) : video ? (
                        <video
                            key={video}
                            src={video}
                            controls
                            className="rounded-md object-cover aspect-video w-full bg-muted"
                        >
                            Your browser does not support the video tag.
                        </video>
                    ) : (
                    <div className="text-sm text-muted-foreground text-center p-8 border-2 border-dashed rounded-md w-full h-full flex flex-col justify-center items-center">
                        <Video className="h-12 w-12 mx-auto text-muted-foreground" />
                        <p className="mt-4">Your generated video will appear here.</p>
                        <p className="text-xs">Click generate to create the visuals.</p>
                    </div>
                    )}
                </CardContent>
            </Card>
      </div>
    </div>
  );
}



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
  jobId: null,
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
  const [jobStatus, setJobStatus] = useState<string>('idle'); // idle, pending, completed, failed
  const { pending } = useFormStatus();

  // Polling function to check job status
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (state.message === 'success' && state.jobId) {
      setJobStatus('pending');
      
      // Start polling for job completion
      intervalId = setInterval(async () => {
        try {
          // In a real implementation, you would call an API endpoint to check job status
          // For now, we'll simulate the polling with a mock implementation
          // This is where you would typically make an API call like:
          // const response = await fetch(`/api/job-status/${state.jobId}`);
          // const data = await response.json();
          
          // Simulate job completion after 5 seconds
          setTimeout(() => {
            if (intervalId) {
              clearInterval(intervalId);
              // Simulate getting a video URL when job completes
              const mockVideoUrl = "https://example.com/generated-video.mp4";
              setVideo(mockVideoUrl);
              setJobStatus('completed');
              onVideoGenerated(mockVideoUrl);
              toast({ title: 'Video Generated!', description: 'Your video has been successfully created.' });
            }
          }, 5000);
        } catch (error) {
          if (intervalId) {
            clearInterval(intervalId);
          }
          setJobStatus('failed');
          toast({
            variant: "destructive",
            title: "Error Generating Video",
            description: "Failed to generate video. Please try again.",
          });
        }
      }, 3000); // Poll every 3 seconds
    } else if (state.message === 'success' && state.video) {
      setVideo(state.video);
      setJobStatus('completed');
      onVideoGenerated(state.video);
      toast({ title: 'Video Generated!', description: 'You can now proceed to the final step.' });
    } else if (state.message && state.message !== 'success' && state.message !== 'Validation failed') {
      setJobStatus('failed');
      toast({
        variant: "destructive",
        title: "Error Generating Video",
        description: state.message,
      });
    }
    
    // Cleanup interval on unmount or when state changes
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
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
                    {pending || jobStatus === 'pending' ? (
                        <div className="w-full space-y-4 flex flex-col items-center justify-center">
                           <Skeleton className="w-full aspect-video rounded-md" />
                           <p className="text-sm text-muted-foreground text-center">
                              {jobStatus === 'pending' ? 'Generating your video...' : 'Submitting your request...'}
                           </p>
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

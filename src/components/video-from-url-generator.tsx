"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clipboard, Download, FileText, Sparkles, Wand2, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { useFormStatus } from 'react-dom';

// Dummy state to prevent errors
const initialState = {
  message: '',
  script: null,
  errors: {} as Record<string, string | string[]>,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  // const pending = false; // Manually set to false
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Sparkles className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
      {pending ? 'Generating Script...' : 'Generate Video Script'}
    </Button>
  );
}

export function VideoFromUrlGenerator() {
  const [state, setState] = useState(initialState); // Use local state
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const { pending } = useFormStatus();
  // const pending = false; // Manually set to false

  const copyToClipboard = () => {
    if (state.script) {
      navigator.clipboard.writeText(state.script);
      toast({
        title: "Copied!",
        description: "The script has been copied to your clipboard.",
      });
    }
  };

  const downloadScript = () => {
    if (state.script) {
        const blob = new Blob([state.script], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'generated-script.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
  };

  const useScriptInPipeline = () => {
    if (!state.script) return;
    sessionStorage.setItem('pipeline_import_script', state.script);
    router.push('/dashboard/video-pipeline?source=video-from-url');
  };

  const handleSubmit = async (formData: FormData) => {
    const url = formData.get('url') as string;
    const topic = formData.get('topic') as string;

    if (!url) {
      toast({
        title: "Error",
        description: "Please provide a URL",
        variant: "destructive"
      });
      return;
    }

    setState(prev => ({ ...prev, message: 'Generating script...' }));

    try {
      // Get session token for authentication
      const sessionResponse = await fetch('/api/auth/session');
      const session = await sessionResponse.json();
      
      const response = await fetch('/api/video/generate-from-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.accessToken || 'temp-token'}`, // Use session token or temp token
        },
        body: JSON.stringify({ url, topic }),
      });

      const data = await response.json();

      if (data.success) {
        setState(prev => ({ ...prev, script: data.script, message: '' }));
        toast({
          title: "Success!",
          description: "Video script generated successfully.",
        });
      } else {
        setState(prev => ({ ...prev, message: '', errors: { general: [data.error] } }));
        toast({
          title: "Error",
          description: data.error || "Failed to generate script",
          variant: "destructive"
        });
      }
    } catch (error) {
      setState(prev => ({ ...prev, message: '', errors: { general: ['Network error occurred'] } }));
      toast({
        title: "Error",
        description: "Failed to connect to the server",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-8 items-start">
      <form className="space-y-4" action={handleSubmit}>
        <div className="space-y-2">
            <Label htmlFor="url">Website or Article URL</Label>
            <Input id="url" name="url" placeholder="https://example.com/blog/my-awesome-article" required />
            {state.errors.url && <p className="text-sm text-destructive">{Array.isArray(state.errors.url) ? state.errors.url[0] : state.errors.url}</p>}
        </div>
        <div className="space-y-2">
            <Label htmlFor="topic">Main Topic or Focus</Label>
            <Textarea 
                id="topic"
                name="topic" 
                placeholder="Briefly describe the key angle for the video. For example: 'Focus on the section about composting for beginners'." 
            />
            {state.errors.topic && <p className="text-sm text-destructive">{Array.isArray(state.errors.topic) ? state.errors.topic[0] : state.errors.topic}</p>}
        </div>
        <SubmitButton />
      </form>
      <div className='sticky top-8'>
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              Generated Script
              {state.script && !pending && (
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={useScriptInPipeline} title="Use in video pipeline">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={copyToClipboard} title="Copy script">
                      <Clipboard className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={downloadScript} title="Download script">
                      <Download className="h-4 w-4" />
                    </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pending ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ) : state.script ? (
              <pre className="whitespace-pre-wrap text-sm font-sans bg-muted p-4 rounded-md max-h-[400px] overflow-y-auto">{state.script}</pre>
            ) : (
              <div className="text-sm text-muted-foreground text-center p-8 border-2 border-dashed rounded-md h-full flex flex-col justify-center items-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="mt-4">Your generated script will appear here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

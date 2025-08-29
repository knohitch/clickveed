

"use client";

import { useEffect, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { generateVideoFromUrlAction } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clipboard, Download, FileText, Sparkles, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';

const initialState = {
  message: '',
  script: null,
  errors: {},
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Sparkles className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
      {pending ? 'Generating Script...' : 'Generate Video Script'}
    </Button>
  );
}

export function VideoFromUrlGenerator() {
  const [state, formAction] = useFormState(generateVideoFromUrlAction, initialState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const { pending } = useFormStatus();

  useEffect(() => {
    if (state.message === 'success') {
      toast({ title: "Success!", description: "Video script generated successfully." });
    } else if (state.message && state.message !== 'success' && state.message !== 'Validation failed') {
      toast({
        variant: "destructive",
        title: "Error Generating Script",
        description: state.message,
      });
    }
  }, [state, toast]);

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

  return (
    <div className="grid md:grid-cols-2 gap-8 items-start">
      <form ref={formRef} action={formAction} className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="url">Website or Article URL</Label>
            <Input id="url" name="url" placeholder="https://example.com/blog/my-awesome-article" required />
            {state.errors?.url && <p className="text-sm text-destructive">{state.errors.url as string}</p>}
        </div>
        <div className="space-y-2">
            <Label htmlFor="topic">Main Topic or Focus</Label>
            <Textarea 
                id="topic"
                name="topic" 
                placeholder="Briefly describe the key angle for the video. For example: 'Focus on the section about composting for beginners'." 
                required 
            />
            {state.errors?.topic && <p className="text-sm text-destructive">{state.errors.topic as string}</p>}
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

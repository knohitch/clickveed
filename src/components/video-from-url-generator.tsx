"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clipboard, Download, FileText, Sparkles, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';

// Dummy state to prevent errors
const initialState = {
  message: '',
  script: null,
  errors: {},
};

function SubmitButton() {
  // const { pending } = useFormStatus();
  const pending = false; // Manually set to false
  return (
    <Button type="submit" disabled className="w-full">
      {pending ? <Sparkles className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
      {pending ? 'Generating Script...' : 'Generate Video Script'}
    </Button>
  );
}

export function VideoFromUrlGenerator() {
  const [state] = useState(initialState); // Use local state
  const { toast } = useToast();
  // const formRef = useRef<HTMLFormElement>(null); // No longer needed
  // const { pending } = useFormStatus(); // No longer needed
  const pending = false; // Manually set to false

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
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}> {/* Prevent form submission */}
        <div className="space-y-2">
            <Label htmlFor="url">Website or Article URL</Label>
            <Input id="url" name="url" placeholder="https://example.com/blog/my-awesome-article" disabled />
            {/* {'url' in state.errors && <p className="text-sm text-destructive">{state.errors.url?.[0] as string}</p>} */}
        </div>
        <div className="space-y-2">
            <Label htmlFor="topic">Main Topic or Focus</Label>
            <Textarea 
                id="topic"
                name="topic" 
                placeholder="Briefly describe the key angle for the video. For example: 'Focus on the section about composting for beginners'." 
                disabled
            />
            {/* {'topic' in state.errors && <p className="text-sm text-destructive">{state.errors.topic?.[0] as string}</p>} */}
        </div>
        <div className="text-center p-4 border border-dashed rounded-md text-muted-foreground">
            This feature is currently unavailable.
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



"use client";

import { useRef, useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Clipboard, Download, FileText, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { generatePipelineScriptAction } from '@/lib/actions';

type Errors = {
    prompt?: string[];
    videoType?: string[];
    tone?: string[];
    duration?: string[];
};

type State = {
    message: string;
    script: string | null;
    errors: Errors | {};
};

const initialState: State = {
  message: '',
  script: null,
  errors: {},
};

// Helper function to safely access error properties
function getError(state: State, field: keyof Errors): string | undefined {
    if (typeof state.errors === 'object' && state.errors !== null && field in state.errors) {
        const errors = (state.errors as Errors)[field];
        return errors && errors.length > 0 ? errors[0] : undefined;
    }
    return undefined;
}

const examplePrompts = {
    "Commercial": "A 30-second ad for 'Sparkle Brew,' a new cold brew coffee that boosts creativity. Show a writer overcoming writer's block after one sip.",
    "Explainer Video": "Explain the concept of photosynthesis in a simple, engaging way for a 5th-grade audience. Use analogies like a plant 'eating' sunlight.",
    "Social Media Ad": "A 15-second, high-energy ad for a new fitness app called 'Jumpstart.' Focus on quick cuts, upbeat music, and diverse people exercising at home.",
    "Tutorial": "A step-by-step tutorial on how to tie a perfect bowline knot. The tone should be clear, calm, and encouraging for beginners.",
    "Product Review": "An honest review of the new 'DroneX Pro' camera drone. Cover its key features, flight stability, and image quality, mentioning both pros and cons.",
};

type VideoType = keyof typeof examplePrompts;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Sparkles className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
      Generate Script
    </Button>
  );
}

interface ScriptStepProps {
    onScriptGenerated: (script: string) => void;
}

export function ScriptStep({ onScriptGenerated }: ScriptStepProps) {
  const [state, formAction] = useFormState(generatePipelineScriptAction, initialState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [script, setScript] = useState<string | null>(null);
  const [videoType, setVideoType] = useState<VideoType | ''>('');
  const [existingScript, setExistingScript] = useState('');
  const { pending } = useFormStatus();


  useEffect(() => {
    if (state.message === 'success' && state.script) {
      setScript(state.script);
      onScriptGenerated(state.script);
      toast({ title: 'Script Generated!', description: 'You can now proceed to the next step.' });
    } else if (state.message && state.message !== 'success' && state.message !== 'Validation failed') {
      toast({
        variant: "destructive",
        title: "Error Generating Script",
        description: state.message,
      });
    }
  }, [state, toast, onScriptGenerated]);

  const copyToClipboard = () => {
    if (script) {
      navigator.clipboard.writeText(script);
      toast({
        title: "Copied!",
        description: "The script has been copied to your clipboard.",
      });
    }
  };

  const downloadScript = () => {
    if (script) {
        const blob = new Blob([script], { type: 'text/plain' });
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

  const handleVideoTypeChange = (value: VideoType) => {
    setVideoType(value);
  }

  const useExistingScript = () => {
    const trimmed = existingScript.trim();
    if (!trimmed) return;
    setScript(trimmed);
    onScriptGenerated(trimmed);
    toast({ title: 'Script Loaded', description: 'Using your existing script in the pipeline.' });
  };

  return (
    <div className="grid md:grid-cols-2 gap-8 items-start">
      <form ref={formRef} action={formAction} className="space-y-4">
        <div className="space-y-2 border rounded-md p-3 bg-muted/40">
            <Label htmlFor="existingScript">Use Existing Script (Optional)</Label>
            <Textarea
                id="existingScript"
                value={existingScript}
                onChange={(e) => setExistingScript(e.target.value)}
                rows={4}
                placeholder="Paste a script from Video from URL or any other source."
            />
            <Button type="button" variant="outline" onClick={useExistingScript} disabled={!existingScript.trim()} className="w-full">
                Use This Script
            </Button>
        </div>

        <div className="space-y-2">
            <Label htmlFor="prompt">What is your video about?</Label>
            <Textarea
                id="prompt"
                name="prompt"
                placeholder={videoType ? examplePrompts[videoType] : "Select a video type to see an example prompt."}
                rows={4}
                required
            />
            {getError(state, 'prompt') && <p className="text-sm text-destructive">{getError(state, 'prompt')}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="videoType">Video Type</Label>
                <Select name="videoType" required onValueChange={(value) => handleVideoTypeChange(value as VideoType)}>
                    <SelectTrigger id="videoType">
                        <SelectValue placeholder="Select a type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Commercial">Commercial</SelectItem>
                        <SelectItem value="Explainer Video">Explainer Video</SelectItem>
                        <SelectItem value="Social Media Ad">Social Media Ad</SelectItem>
                        <SelectItem value="Tutorial">Tutorial</SelectItem>
                        <SelectItem value="Product Review">Product Review</SelectItem>
                    </SelectContent>
                </Select>
                 {getError(state, 'videoType') && <p className="text-sm text-destructive">{getError(state, 'videoType')}</p>}
            </div>
             <div className="space-y-2">
                <Label htmlFor="tone">Tone of Voice</Label>
                <Select name="tone" required>
                    <SelectTrigger id="tone">
                        <SelectValue placeholder="Select a tone" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Humorous">Humorous</SelectItem>
                        <SelectItem value="Formal">Formal</SelectItem>
                        <SelectItem value="Inspirational">Inspirational</SelectItem>
                        <SelectItem value="Casual">Casual</SelectItem>
                        <SelectItem value="Dramatic">Dramatic</SelectItem>
                    </SelectContent>
                </Select>
                 {getError(state, 'tone') && <p className="text-sm text-destructive">{getError(state, 'tone')}</p>}
            </div>
        </div>

        <div className="space-y-2">
            <Label htmlFor="duration">Target Duration</Label>
            <Input id="duration" name="duration" placeholder="e.g., 30 seconds" required />
            {getError(state, 'duration') && <p className="text-sm text-destructive">{getError(state, 'duration')}</p>}
        </div>

        <SubmitButton />
      </form>
      <div className="sticky top-8">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              Generated Script
              {script && !pending && (
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
            ) : script ? (
              <pre className="whitespace-pre-wrap text-sm font-sans bg-muted p-4 rounded-md max-h-[400px] overflow-y-auto">{script}</pre>
            ) : (
              <div className="text-sm text-muted-foreground text-center p-8 border-2 border-dashed rounded-md h-full flex flex-col justify-center items-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="mt-4">Your generated script will appear here.</p>
                <p className="text-xs">Fill out the form to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

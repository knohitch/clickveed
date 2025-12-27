

"use client";

import { useRef, useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Clipboard, Download, Sparkles, Clapperboard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from './ui/input';
import { Skeleton } from './ui/skeleton';
import { generateScriptAction } from '@/lib/actions';

type ScriptActionState = {
  message: string;
  script: string | null;
  errors: {
    prompt?: string[];
    videoType?: string[];
    tone?: string[];
    duration?: string[];
  };
};

const initialState: ScriptActionState = {
  message: '',
  script: null,
  errors: {},
};

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
      {pending ? <Sparkles className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
      {pending ? 'Generating...' : 'Generate Script'}
    </Button>
  );
}

function ScriptGeneratorForm() {
    const [state, formAction] = useFormState<ScriptActionState, FormData>(generateScriptAction, initialState);
    const { toast } = useToast();
    const promptRef = useRef<HTMLTextAreaElement>(null);
    const [videoType, setVideoType] = useState<VideoType | ''>('');
    const { pending } = useFormStatus();

    const [script, setScript] = useState<string | null>(null);

    useEffect(() => {
        if (state.message === 'success' && state.script) {
          setScript(state.script);
        } else if (state.message && state.message !== 'success' && state.message !== 'Validation failed') {
          toast({
            variant: "destructive",
            title: "Error Generating Script",
            description: state.message,
          });
        }
    }, [state, toast]);

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
        // Only set example prompt if the user hasn't typed anything
        if (promptRef.current && promptRef.current.value.trim() === '' && value && examplePrompts[value]) {
            promptRef.current.value = examplePrompts[value];
        }
    }

    return (
        <div className="grid md:grid-cols-2 gap-8 items-start">
            <form action={formAction} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="prompt">What is your video about?</Label>
                    <Textarea
                        ref={promptRef}
                        id="prompt"
                        name="prompt"
                        placeholder={videoType ? examplePrompts[videoType] : "Select a video type to see an example prompt."}
                        rows={4}
                        required
                    />
                    {state.errors?.prompt && <p className="text-sm text-destructive">{state.errors.prompt[0]}</p>}
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
                         {state.errors?.videoType && <p className="text-sm text-destructive">{state.errors.videoType[0]}</p>}
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
                         {state.errors?.tone && <p className="text-sm text-destructive">{state.errors.tone[0]}</p>}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="duration">Target Duration</Label>
                    <Input id="duration" name="duration" placeholder="e.g., 30 seconds" required />
                    {state.errors?.duration && <p className="text-sm text-destructive">{state.errors.duration[0]}</p>}
                </div>

                <SubmitButton />
            </form>
            <div className="sticky top-8">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Clapperboard className="h-5 w-5" /> Generated Script
                      </div>
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
                        <Clapperboard className="h-12 w-12 mx-auto text-muted-foreground" />
                        <p className="mt-4">Your generated script will appear here.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
            </div>
        </div>
    );
}

export function ScriptGenerator() {
    return <ScriptGeneratorForm />;
}

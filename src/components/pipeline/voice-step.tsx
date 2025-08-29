

"use client";

import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, Sparkles, Download, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { generatePipelineVoiceOverAction } from '@/lib/actions';
import { Textarea } from '../ui/textarea';

const initialState = {
  message: '',
  audio: null,
  errors: {},
};

const voiceOptions = [
    {
        label: "American English",
        voices: [
            { value: "en-US-Standard-C", label: "Male - Narrator" },
            { value: "Algenib", label: "Male - Deep" },
            { value: "en-US-Standard-F", label: "Female - Standard" },
            { value: "Achernar", label: "Female - Announcer" },
        ]
    },
    {
        label: "British English",
        voices: [
            { value: "en-GB-Standard-B", label: "Male - Standard" },
            { value: "en-GB-Standard-A", label: "Female - Standard" },
        ]
    },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Sparkles className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
      Generate Voice Over
    </Button>
  );
}

interface VoiceStepProps {
    script: string;
    onVoiceoverGenerated: (audioDataUri: string) => void;
}

export function VoiceStep({ script, onVoiceoverGenerated }: VoiceStepProps) {
  const [state, formAction] = useFormState(generatePipelineVoiceOverAction, initialState);
  const { toast } = useToast();
  const [audio, setAudio] = useState<string | null>(null);
  const { pending } = useFormStatus();


  useEffect(() => {
    if (state.message === 'success' && state.audio) {
      setAudio(state.audio);
      onVoiceoverGenerated(state.audio);
      toast({ title: 'Voice Over Generated!', description: 'You can now proceed to the next step.' });
    } else if (state.message && state.message !== 'success' && state.message !== 'Validation failed') {
      toast({
        variant: "destructive",
        title: "Error Generating Voice Over",
        description: state.message,
      });
    }
  }, [state, toast, onVoiceoverGenerated]);

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
                <div className="space-y-2">
                    <Label htmlFor="voice">Choose a Voice</Label>
                    <Select name="voice" required defaultValue="Algenib">
                        <SelectTrigger>
                            <SelectValue placeholder="Select a voice" />
                        </SelectTrigger>
                        <SelectContent>
                            {voiceOptions.map(group => (
                                <SelectGroup key={group.label}>
                                    <SelectLabel>{group.label}</SelectLabel>
                                    {group.voices.map(voice => (
                                        <SelectItem key={voice.value} value={voice.value}>{voice.label}</SelectItem>
                                    ))}
                                </SelectGroup>
                            ))}
                        </SelectContent>
                    </Select>
                    {state.errors?.voice && <p className="text-sm text-destructive">{state.errors.voice[0]}</p>}
                </div>
                <SubmitButton />
            </form>
        </div>
        
        <div className="sticky top-8">
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                    Generated Audio
                    {audio && !pending && (
                        <Button variant="ghost" size="icon" asChild>
                        <a href={audio} download="pipeline-voiceover.wav">
                            <Download className="h-4 w-4" />
                        </a>
                        </Button>
                    )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-full">
                    {pending ? (
                        <div className="w-full space-y-2">
                            <Skeleton className="h-12 w-full" />
                        </div>
                    ) : audio ? (
                    <audio src={audio} controls className="w-full" />
                    ) : (
                    <div className="text-sm text-muted-foreground text-center p-8 border-2 border-dashed rounded-md w-full h-full flex flex-col justify-center items-center">
                        <Mic className="h-12 w-12 mx-auto text-muted-foreground" />
                        <p className="mt-4">Your generated voice over will appear here.</p>
                        <p className="text-xs">Select a voice and click generate.</p>
                    </div>
                    )}
                </CardContent>
            </Card>
      </div>
    </div>
  );
}



"use client";

import { useEffect, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { generateVoiceOverAction } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Download, Mic, Plus, Sparkles, Trash2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { Label } from './ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';

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


function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} className="w-full">
      {pending ? <Sparkles className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
      {pending ? 'Generating...' : 'Generate Voice Over'}
    </Button>
  );
}

function VoiceSelector({ name, defaultValue, onValueChange }: { name: string, defaultValue?: string, onValueChange?: (value: string) => void }) {
    return (
        <Select name={name} defaultValue={defaultValue} onValueChange={onValueChange} required>
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
    )
}

export function VoiceOverGenerator() {
  const [state, formAction] = useFormState(generateVoiceOverAction, initialState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [audio, setAudio] = useState<string | null>(null);
  const [isMultiSpeaker, setIsMultiSpeaker] = useState(false);
  const [speakers, setSpeakers] = useState([{ id: 1, voice: 'Algenib' }]);
  const { pending } = useFormStatus();


  useEffect(() => {
    if (state.message === 'success' && state.audio) {
      setAudio(state.audio);
      toast({ title: 'Success', description: 'Voice over generated successfully.' });
    } else if (state.message && state.message !== 'success' && state.message !== 'Validation failed') {
      toast({
        variant: "destructive",
        title: "Error Generating Voice Over",
        description: state.message,
      });
    }
  }, [state, toast]);

  const addSpeaker = () => {
    setSpeakers([...speakers, { id: Date.now(), voice: 'en-GB-Standard-A' }]);
  };

  const removeSpeaker = (id: number) => {
    setSpeakers(speakers.filter(s => s.id !== id));
  };
  
  const handleSpeakerVoiceChange = (id: number, voice: string) => {
    setSpeakers(speakers.map(s => (s.id === id ? { ...s, voice } : s)));
  };

  const handleModeChange = (checked: boolean) => {
    setIsMultiSpeaker(checked);
    // Reset state when mode changes to avoid confusion
    setSpeakers([{ id: 1, voice: 'Algenib' }]);
    setAudio(null);
  }

  const singleSpeakerError = 'speakers' in state.errors ? state.errors.speakers?.[0] as unknown as { voice: string[] } | undefined : undefined;
  
  return (
    <div className="grid md:grid-cols-2 gap-8 items-start">
      <form ref={formRef} action={formAction} className="space-y-4">
        <input type="hidden" name="speakers" value={JSON.stringify(speakers)} />

        <div className="space-y-2">
            <Label htmlFor="script">Script</Label>
            <Textarea
                id="script"
                name="script"
                placeholder={isMultiSpeaker ? "e.g., Speaker1: Hello there. Speaker2: Hi, how are you?" : "Enter the script you want to convert to a voice over..."}
                rows={8}
                required
            />
            {'script' in state.errors && <p className="text-sm text-destructive">{state.errors.script?.[0] as string}</p>}
        </div>
        
        <div className="flex items-center space-x-2">
            <Switch id="isMultiSpeaker" name="isMultiSpeaker" checked={isMultiSpeaker} onCheckedChange={handleModeChange} />
            <Label htmlFor="isMultiSpeaker" className="flex items-center gap-2"><Users className="h-4 w-4" /> Multi-Speaker Mode</Label>
        </div>

        {isMultiSpeaker ? (
            <div className="space-y-4 rounded-md border p-4">
                {speakers.map((speaker, index) => (
                     <div key={speaker.id} className="flex items-end gap-2">
                        <div className="flex-1 space-y-2">
                            <Label htmlFor={`speaker${speaker.id}`}>Speaker {index + 1}</Label>
                            <VoiceSelector
                                name={`speaker-voice-${speaker.id}`} // Unique name, not submitted directly
                                defaultValue={speaker.voice}
                                onValueChange={(voice) => handleSpeakerVoiceChange(speaker.id, voice)}
                            />
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeSpeaker(speaker.id)} disabled={speakers.length <= 1}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
                <Button type="button" variant="outline" onClick={addSpeaker} className="w-full">
                    <Plus className="mr-2 h-4 w-4" /> Add Speaker
                </Button>
            </div>
        ) : (
            <div className="space-y-2">
                <Label htmlFor="voice">Voice</Label>
                <VoiceSelector 
                    name="voice" 
                    defaultValue="Algenib" 
                    onValueChange={(voice) => setSpeakers([{ id: 1, voice }])}
                />
                {singleSpeakerError?.voice && <p className="text-sm text-destructive">{singleSpeakerError.voice[0]}</p>}
            </div>
        )}

        <SubmitButton disabled={pending} />
      </form>
      <div className="sticky top-8">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              Generated Audio
              {audio && !pending && (
                <Button variant="ghost" size="icon" asChild>
                  <a href={audio} download="voice-over.wav">
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

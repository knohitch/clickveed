'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { generateVideoGeneratorAction } from '@/lib/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Download, Film, Video, Clapperboard, Clock3, Ratio, Camera, MoveRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const initialState = {
  message: '',
  videoUrl: null as string | null,
  provider: null as string | null,
  model: null as string | null,
  errors: {} as Record<string, string[] | undefined>,
};

function GenerateButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? <Sparkles className="mr-2 h-4 w-4 animate-spin" /> : <Film className="mr-2 h-4 w-4" />}
      {pending ? 'Generating...' : 'Generate Video'}
    </Button>
  );
}

export function VideoGeneratorStudio() {
  const [state, formAction] = useFormState(generateVideoGeneratorAction as any, initialState);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (state.message === 'success' && state.videoUrl) {
      setVideoUrl(state.videoUrl);
      setProvider(state.provider || null);
      setModel(state.model || null);
      setHistory((prev) => [state.videoUrl as string, ...prev].slice(0, 5));
      toast({
        title: 'Video Generated',
        description: 'Rendered with Veo priority and automatic fallback providers.',
      });
      return;
    }

    if (state.message && state.message !== 'success') {
      toast({ variant: 'destructive', title: 'Generation failed', description: state.message });
    }
  }, [state, toast]);

  const latestVideos = useMemo(() => {
    const dedup = Array.from(new Set([videoUrl, ...history].filter(Boolean))) as string[];
    return dedup.slice(0, 5);
  }, [videoUrl, history]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <Card className="xl:col-span-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clapperboard className="h-5 w-5" />
            Prompt Builder
          </CardTitle>
          <CardDescription>
            Industry-style text-to-video workflow. Veo is used first, then fallback providers when needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prompt">Scene Prompt</Label>
              <Textarea
                id="prompt"
                name="prompt"
                required
                rows={6}
                placeholder="A cinematic drone reveal of a futuristic city at sunrise, volumetric light, subtle fog, realistic reflections on wet streets..."
              />
              {state.errors?.prompt?.[0] && <p className="text-sm text-destructive">{state.errors.prompt[0]}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Video className="h-4 w-4" />Style</Label>
                <Select name="style" defaultValue="cinematic">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cinematic">Cinematic</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="documentary">Documentary</SelectItem>
                    <SelectItem value="anime">Anime</SelectItem>
                    <SelectItem value="photoreal">Photoreal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Clock3 className="h-4 w-4" />Duration</Label>
                <Select name="duration" defaultValue="8s">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5s">5 seconds</SelectItem>
                    <SelectItem value="8s">8 seconds</SelectItem>
                    <SelectItem value="12s">12 seconds</SelectItem>
                    <SelectItem value="16s">16 seconds</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Ratio className="h-4 w-4" />Aspect Ratio</Label>
                <Select name="aspectRatio" defaultValue="16:9">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16:9">16:9 Landscape</SelectItem>
                    <SelectItem value="9:16">9:16 Vertical</SelectItem>
                    <SelectItem value="1:1">1:1 Square</SelectItem>
                    <SelectItem value="4:5">4:5 Portrait</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Camera className="h-4 w-4" />Camera Move</Label>
                <Select name="camera" defaultValue="slow-dolly-in">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slow-dolly-in">Slow Dolly In</SelectItem>
                    <SelectItem value="orbital">Orbital</SelectItem>
                    <SelectItem value="handheld">Handheld</SelectItem>
                    <SelectItem value="crane-up">Crane Up</SelectItem>
                    <SelectItem value="locked">Locked Shot</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2"><MoveRight className="h-4 w-4" />Motion Energy</Label>
              <Input name="motion" defaultValue="smooth and controlled" placeholder="e.g., energetic and fast cuts" />
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Veo Primary</Badge>
              <Badge variant="outline">Auto Fallback</Badge>
              <Badge variant="outline">Provider-Routed</Badge>
              {provider && <Badge variant="outline">Provider: {provider}</Badge>}
              {model && <Badge variant="outline">Model: {model}</Badge>}
            </div>

            <GenerateButton />
          </form>
        </CardContent>
      </Card>

      <Card className="xl:col-span-7">
        <CardHeader>
          <CardTitle>Output Monitor</CardTitle>
          <CardDescription>Generation result and recent renders.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border bg-muted/20 p-3">
            {videoUrl ? (
              <video src={videoUrl} controls className="w-full aspect-video rounded-lg bg-black" />
            ) : (
              <div className="w-full aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground">
                <Film className="h-10 w-10 mb-2" />
                <p>No render yet. Submit a prompt to generate.</p>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="outline" size="sm" disabled={!videoUrl} asChild>
              <a href={videoUrl || '#'} download="generated-video.mp4">
                <Download className="mr-2 h-4 w-4" />
                Download
              </a>
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Recent Renders</Label>
            {latestVideos.length === 0 ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="space-y-2">
                {latestVideos.map((url) => (
                  <button
                    key={url}
                    className="w-full text-left px-3 py-2 rounded-md border hover:bg-muted transition-colors"
                    onClick={() => setVideoUrl(url)}
                  >
                    <p className="text-sm font-medium truncate">{url}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

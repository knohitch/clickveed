'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Clapperboard, Download, UploadCloud, Bot, Sparkles, FilePenLine, Play, Pause,
  Plus, Trash2, Film, Music, Type, Clock3, SlidersHorizontal, Layers3, Scissors,
  Copy, Undo2, Redo2, Volume2, Wand2
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { suggestBroll, fetchStockVideos } from '@/server/ai/flows/suggest-b-roll';
import type { StockVideoResult } from '@/server/ai/flows/suggest-b-roll';
import { Skeleton } from '@/components/ui/skeleton';

type TrackType = 'video' | 'audio' | 'text';
type TransitionType = 'none' | 'cut' | 'dissolve' | 'fade';
type EffectType = 'none' | 'cinematic' | 'vintage' | 'high-contrast';
type RenderStatus = 'queued' | 'rendering' | 'completed';

interface TimelineClip {
  id: string;
  track: TrackType;
  label: string;
  src?: string;
  thumbnail?: string;
  start: number;
  duration: number;
  text?: string;
  volume?: number;
  transition?: TransitionType;
  effect?: EffectType;
}

interface RenderJob {
  id: string;
  name: string;
  status: RenderStatus;
  progress: number;
  createdAt: number;
}

const STORAGE_KEY = 'video_editor_timeline_v2';
const SNAP_THRESHOLD = 0.25;

const timelineBase: TimelineClip[] = [
  {
    id: 'v1',
    track: 'video',
    label: 'Intro Shot',
    start: 0,
    duration: 6,
    src: 'https://placehold.co/1280x720.png',
    thumbnail: 'https://placehold.co/320x180.png',
    transition: 'none',
    effect: 'cinematic',
  },
  {
    id: 'a1',
    track: 'audio',
    label: 'Music Bed',
    start: 0,
    duration: 12,
    volume: 80,
    transition: 'none',
    effect: 'none',
  },
  {
    id: 't1',
    track: 'text',
    label: 'Headline',
    start: 1,
    duration: 4,
    text: 'Build Better Videos Faster',
    transition: 'dissolve',
    effect: 'none',
  },
];

function TrackBadge({ track }: { track: TrackType }) {
  if (track === 'video') return <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">VIDEO</span>;
  if (track === 'audio') return <span className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700">AUDIO</span>;
  return <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700">TEXT</span>;
}

function cloneClips(clips: TimelineClip[]): TimelineClip[] {
  return clips.map((c) => ({ ...c }));
}

export default function VideoEditorPage() {
  const { toast } = useToast();
  const [clips, setClips] = useState<TimelineClip[]>(timelineBase);
  const [selectedClipIds, setSelectedClipIds] = useState<Set<string>>(new Set(['v1']));
  const [mediaBin, setMediaBin] = useState<StockVideoResult[]>([]);
  const [brollSuggestions, setBrollSuggestions] = useState<string[]>([]);
  const [timelineZoom, setTimelineZoom] = useState(90);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadSec, setPlayheadSec] = useState(0);
  const [fetchPending, startFetchTransition] = useTransition();
  const [suggestPending, startSuggestTransition] = useTransition();
  const [historyStack, setHistoryStack] = useState<TimelineClip[][]>([]);
  const [redoStack, setRedoStack] = useState<TimelineClip[][]>([]);
  const [renderJobs, setRenderJobs] = useState<RenderJob[]>([]);
  const [trackMuted, setTrackMuted] = useState<Record<TrackType, boolean>>({
    video: false,
    audio: false,
    text: false,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const selectedClips = useMemo(() => clips.filter((c) => selectedClipIds.has(c.id)), [clips, selectedClipIds]);
  const selectedClip = selectedClips[0] || null;
  const timelineDuration = useMemo(() => Math.max(20, ...clips.map((c) => c.start + c.duration + 1)), [clips]);
  const tracks: TrackType[] = ['video', 'audio', 'text'];

  const commitClips = (updater: (prev: TimelineClip[]) => TimelineClip[], actionMessage?: string) => {
    setClips((prev) => {
      const next = updater(prev);
      setHistoryStack((h) => [...h.slice(-39), cloneClips(prev)]);
      setRedoStack([]);
      if (actionMessage) {
        toast({ title: 'Updated', description: actionMessage });
      }
      return next;
    });
  };

  const snapValue = (value: number, activeClipId?: string) => {
    const edges = clips
      .filter((c) => c.id !== activeClipId)
      .flatMap((c) => [c.start, c.start + c.duration]);
    let best = value;
    let bestDiff = SNAP_THRESHOLD;
    edges.forEach((edge) => {
      const diff = Math.abs(edge - value);
      if (diff <= bestDiff) {
        best = edge;
        bestDiff = diff;
      }
    });
    return Number(best.toFixed(2));
  };

  const undo = () => {
    setHistoryStack((h) => {
      if (h.length === 0) return h;
      const previous = h[h.length - 1];
      setRedoStack((r) => [...r, cloneClips(clips)]);
      setClips(previous);
      return h.slice(0, -1);
    });
  };

  const redo = () => {
    setRedoStack((r) => {
      if (r.length === 0) return r;
      const next = r[r.length - 1];
      setHistoryStack((h) => [...h, cloneClips(clips)]);
      setClips(next);
      return r.slice(0, -1);
    });
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as TimelineClip[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setClips(parsed);
        setSelectedClipIds(new Set([parsed[0].id]));
      }
    } catch {
      // ignore restore failures
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clips));
  }, [clips]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isPlaying) {
      timer = setInterval(() => {
        setPlayheadSec((prev) => {
          const next = prev + 0.1;
          if (next >= timelineDuration) {
            setIsPlaying(false);
            return timelineDuration;
          }
          return Number(next.toFixed(1));
        });
      }, 100);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, timelineDuration]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isTyping) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsPlaying(false);
      } else if (e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setPlayheadSec((p) => Math.max(0, Number((p - 1).toFixed(2))));
      } else if (e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setPlayheadSec((p) => Math.min(timelineDuration, Number((p + 1).toFixed(2))));
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === 'Delete') {
        e.preventDefault();
        handleDeleteSelected(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setRenderJobs((prev) =>
        prev.map((job) => {
          if (job.status === 'completed') return job;
          const next = Math.min(100, job.progress + (job.status === 'queued' ? 18 : 12));
          const status: RenderStatus = next >= 100 ? 'completed' : 'rendering';
          return { ...job, progress: next, status };
        })
      );
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  const addTextClip = () => {
    const id = `t-${Date.now()}`;
    const clip: TimelineClip = {
      id,
      track: 'text',
      label: 'New Text',
      start: snapValue(Math.max(0, Math.floor(playheadSec))),
      duration: 3,
      text: 'New caption',
      transition: 'dissolve',
      effect: 'none',
    };
    commitClips((prev) => [...prev, clip], 'Text clip added');
    setSelectedClipIds(new Set([id]));
  };

  const addAudioClip = () => {
    const id = `a-${Date.now()}`;
    const clip: TimelineClip = {
      id,
      track: 'audio',
      label: 'New Audio',
      start: snapValue(Math.max(0, Math.floor(playheadSec))),
      duration: 6,
      volume: 80,
      transition: 'none',
      effect: 'none',
    };
    commitClips((prev) => [...prev, clip], 'Audio clip added');
    setSelectedClipIds(new Set([id]));
  };

  const addVideoClipFromMedia = (item: StockVideoResult) => {
    const id = `v-${Date.now()}`;
    const clip: TimelineClip = {
      id,
      track: 'video',
      label: item.description.slice(0, 24) || 'Video clip',
      start: snapValue(Math.max(0, Math.floor(playheadSec))),
      duration: 4,
      src: item.url,
      thumbnail: item.thumbnail,
      transition: 'cut',
      effect: 'none',
    };
    commitClips((prev) => [...prev, clip], 'Video clip added');
    setSelectedClipIds(new Set([id]));
  };

  const handleDeleteSelected = (ripple: boolean) => {
    if (selectedClipIds.size === 0) return;
    commitClips((prev) => {
      const selected = prev.filter((c) => selectedClipIds.has(c.id));
      if (!ripple || selected.length === 0) {
        return prev.filter((c) => !selectedClipIds.has(c.id));
      }
      const next = prev.filter((c) => !selectedClipIds.has(c.id));
      const shifts = new Map<TrackType, { from: number; amount: number }[]>();
      selected.forEach((c) => {
        const entry = shifts.get(c.track) || [];
        entry.push({ from: c.start, amount: c.duration });
        shifts.set(c.track, entry);
      });
      return next.map((clip) => {
        const trackShifts = shifts.get(clip.track) || [];
        const totalShift = trackShifts
          .filter((s) => clip.start >= s.from)
          .reduce((acc, s) => acc + s.amount, 0);
        return totalShift > 0 ? { ...clip, start: Math.max(0, Number((clip.start - totalShift).toFixed(2))) } : clip;
      });
    }, ripple ? 'Ripple delete applied' : 'Clips deleted');
    const remaining = clips.filter((c) => !selectedClipIds.has(c.id));
    setSelectedClipIds(new Set(remaining[0] ? [remaining[0].id] : []));
  };

  const splitSelectedClip = () => {
    if (!selectedClip) return;
    if (playheadSec <= selectedClip.start || playheadSec >= selectedClip.start + selectedClip.duration) {
      toast({ variant: 'destructive', title: 'Invalid split point', description: 'Move playhead inside selected clip.' });
      return;
    }
    const leftDuration = Number((playheadSec - selectedClip.start).toFixed(2));
    const rightDuration = Number((selectedClip.duration - leftDuration).toFixed(2));
    const right: TimelineClip = {
      ...selectedClip,
      id: `${selectedClip.id}-s-${Date.now()}`,
      start: Number(playheadSec.toFixed(2)),
      duration: rightDuration,
      label: `${selectedClip.label} (B)`,
    };
    commitClips((prev) =>
      prev.flatMap((c) => {
        if (c.id !== selectedClip.id) return [c];
        return [{ ...c, duration: leftDuration, label: `${c.label} (A)` }, right];
      }), 'Clip split');
    setSelectedClipIds(new Set([right.id]));
  };

  const duplicateSelected = () => {
    if (!selectedClip) return;
    const dup: TimelineClip = {
      ...selectedClip,
      id: `${selectedClip.id}-dup-${Date.now()}`,
      start: snapValue(selectedClip.start + selectedClip.duration, selectedClip.id),
      label: `${selectedClip.label} Copy`,
    };
    commitClips((prev) => [...prev, dup], 'Clip duplicated');
    setSelectedClipIds(new Set([dup.id]));
  };

  const updateSelectedClip = (patch: Partial<TimelineClip>) => {
    if (!selectedClip) return;
    commitClips((prev) =>
      prev.map((c) => {
        if (c.id !== selectedClip.id) return c;
        const maybeStart = patch.start !== undefined ? snapValue(Math.max(0, patch.start), c.id) : c.start;
        return { ...c, ...patch, start: maybeStart };
      })
    );
  };

  const handleUpload = (file: File | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const media: StockVideoResult = {
      id: `local-${Date.now()}`,
      url,
      thumbnail: file.type.startsWith('image') ? url : 'https://placehold.co/320x180.png?text=Video',
      description: file.name,
      photographer: 'Local Upload',
    };
    setMediaBin((prev) => [media, ...prev]);
    toast({ title: 'Uploaded', description: `${file.name} added to media bin.` });
  };

  const handleSuggestBroll = () => {
    const contextText = selectedClip?.text || selectedClip?.label || '';
    if (!contextText) {
      toast({ variant: 'destructive', title: 'No context', description: 'Select a clip with caption/label first.' });
      return;
    }
    startSuggestTransition(async () => {
      try {
        setBrollSuggestions([]);
        const result = await suggestBroll({ script: contextText });
        setBrollSuggestions(result.suggestions);
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to get suggestions.';
        toast({ variant: 'destructive', title: 'Suggestion failed', description: msg });
      }
    });
  };

  const handleFetchStock = (term: string) => {
    startFetchTransition(async () => {
      try {
        const result = await fetchStockVideos({ searchTerm: term });
        setMediaBin((prev) => [...result.videos, ...prev]);
        toast({ title: 'Media fetched', description: `Added ${result.videos.length} clips for "${term}".` });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to fetch stock videos.';
        toast({ variant: 'destructive', title: 'Fetch failed', description: msg });
      }
    });
  };

  const queueRender = () => {
    const id = `render-${Date.now()}`;
    const job: RenderJob = {
      id,
      name: `Render ${new Date().toLocaleTimeString()}`,
      status: 'queued',
      progress: 0,
      createdAt: Date.now(),
    };
    setRenderJobs((prev) => [job, ...prev].slice(0, 8));
    toast({ title: 'Render queued', description: 'Background render started.' });
  };

  const togglePlay = () => setIsPlaying((p) => !p);

  const activeTextClip = clips.find((c) => c.track === 'text' && playheadSec >= c.start && playheadSec <= c.start + c.duration);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <Card className="xl:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Layers3 className="h-5 w-5" />Media & AI</CardTitle>
          <CardDescription>Upload assets, fetch stock media, and assist edits with AI.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full" onClick={() => uploadRef.current?.click()}>
            <UploadCloud className="mr-2 h-4 w-4" /> Upload Media
          </Button>
          <Input ref={uploadRef} type="file" className="hidden" accept="image/*,video/*,audio/*" onChange={(e) => handleUpload(e.target.files?.[0] || null)} />

          <div className="grid grid-cols-2 gap-2">
            <Button className="w-full" variant="outline" onClick={addTextClip}><Type className="mr-2 h-4 w-4" />Text</Button>
            <Button className="w-full" variant="outline" onClick={addAudioClip}><Music className="mr-2 h-4 w-4" />Audio</Button>
          </div>

          <Button className="w-full" variant="outline" onClick={handleSuggestBroll} disabled={suggestPending}>
            {suggestPending ? <Sparkles className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
            Suggest B-Roll
          </Button>

          {brollSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {brollSuggestions.map((term) => (
                <Button key={term} size="sm" variant="secondary" onClick={() => handleFetchStock(term)} disabled={fetchPending}>
                  {term}
                </Button>
              ))}
            </div>
          )}

          <Separator />
          <div>
            <Label>Media Bin</Label>
            <ScrollArea className="h-64 mt-2 pr-2">
              <div className="space-y-2">
                {fetchPending && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                {!fetchPending && mediaBin.length === 0 && (
                  <p className="text-xs text-muted-foreground">No media yet. Upload or fetch clips.</p>
                )}
                {mediaBin.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addVideoClipFromMedia(item)}
                    className="w-full p-2 border rounded-md hover:bg-muted text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Image src={item.thumbnail} alt={item.description} width={72} height={40} className="rounded object-cover bg-muted aspect-video" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{item.description}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{item.photographer}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      <div className="xl:col-span-6 space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Clapperboard className="h-5 w-5" />Program Monitor</CardTitle>
              <CardDescription>
                Space: play/pause, J/K/L: shuttle, Ctrl/Cmd+Z/Y: undo/redo.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="outline" onClick={undo} disabled={historyStack.length === 0}><Undo2 className="h-4 w-4" /></Button>
              <Button size="icon" variant="outline" onClick={redo} disabled={redoStack.length === 0}><Redo2 className="h-4 w-4" /></Button>
              <Button size="icon" variant="outline" onClick={togglePlay}>{isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
              <Button size="icon" variant="outline" onClick={() => setPlayheadSec(0)}><Clock3 className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-video rounded-lg bg-black overflow-hidden">
              {selectedClip?.track === 'video' ? (
                selectedClip.src?.includes('placehold.co') ? (
                  <Image src={selectedClip.src} alt="Preview" fill className="object-cover" />
                ) : (
                  <video ref={videoRef} src={selectedClip?.src} className="w-full h-full object-cover" controls={false} />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-300">
                  <Film className="h-10 w-10 mr-2" /> Track preview
                </div>
              )}
              {activeTextClip && !trackMuted.text && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/55 text-white px-4 py-2 rounded-md font-semibold">
                  {activeTextClip.text}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5" />Timeline</CardTitle>
            <CardDescription>Multi-track timeline with snapping, split, duplicate, and ripple delete.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Label className="min-w-24">Zoom</Label>
              <Input type="range" min={50} max={180} value={timelineZoom} onChange={(e) => setTimelineZoom(Number(e.target.value))} />
              <span className="text-xs text-muted-foreground">{timelineZoom}%</span>
              <span className="text-xs text-muted-foreground">Playhead: {playheadSec.toFixed(1)}s</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={splitSelectedClip} disabled={!selectedClip}><Scissors className="mr-2 h-4 w-4" />Split</Button>
              <Button variant="outline" size="sm" onClick={duplicateSelected} disabled={!selectedClip}><Copy className="mr-2 h-4 w-4" />Duplicate</Button>
              <Button variant="destructive" size="sm" onClick={() => handleDeleteSelected(false)} disabled={selectedClipIds.size === 0}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
              <Button variant="secondary" size="sm" onClick={() => handleDeleteSelected(true)} disabled={selectedClipIds.size === 0}><Trash2 className="mr-2 h-4 w-4" />Ripple Delete</Button>
              <Button variant="outline" size="sm" asChild><Link href="/dashboard/video-editor/transcript-editor"><FilePenLine className="mr-2 h-4 w-4" />Transcript Editor</Link></Button>
            </div>

            <div className="relative border rounded-md p-3 overflow-x-auto">
              <div className="absolute top-0 bottom-0 w-px bg-red-500/80 z-20" style={{ left: `${(playheadSec / timelineDuration) * 100}%` }} />
              <div className="mb-3 flex">
                {Array.from({ length: timelineDuration + 1 }).map((_, i) => (
                  <div key={i} className="text-[10px] text-muted-foreground" style={{ width: `${timelineZoom / 2}px` }}>
                    {i}s
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {tracks.map((track) => (
                  <div key={track} className="flex items-stretch gap-2">
                    <button
                      type="button"
                      className={`w-20 text-xs font-semibold uppercase border rounded px-2 py-2 ${trackMuted[track] ? 'bg-destructive/10 text-destructive' : 'bg-muted/40 text-muted-foreground'}`}
                      onClick={() => setTrackMuted((prev) => ({ ...prev, [track]: !prev[track] }))}
                    >
                      {trackMuted[track] ? `M ${track}` : track}
                    </button>
                    <div className="relative flex-1 border rounded min-h-[56px] bg-muted/20">
                      {clips.filter((c) => c.track === track).map((clip) => {
                        const selected = selectedClipIds.has(clip.id);
                        return (
                          <button
                            key={clip.id}
                            onClick={(e) => {
                              if (e.ctrlKey || e.metaKey) {
                                setSelectedClipIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(clip.id)) next.delete(clip.id); else next.add(clip.id);
                                  return next;
                                });
                              } else {
                                setSelectedClipIds(new Set([clip.id]));
                              }
                            }}
                            className={`absolute top-1/2 -translate-y-1/2 h-10 px-3 rounded-md border text-xs text-left ${selected ? 'border-primary bg-primary/15' : 'bg-background hover:bg-muted'}`}
                            style={{
                              left: `${clip.start * (timelineZoom / 2)}px`,
                              width: `${Math.max(64, clip.duration * (timelineZoom / 2))}px`,
                            }}
                          >
                            <p className="font-semibold truncate">{clip.label}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="xl:col-span-3">
        <CardHeader>
          <CardTitle>Inspector & Render</CardTitle>
          <CardDescription>Clip properties, effects, and background export queue.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedClip ? (
            <>
              <div className="flex items-center justify-between">
                <Label>Clip Type</Label>
                <TrackBadge track={selectedClip.track} />
              </div>
              <div className="space-y-2">
                <Label>Label</Label>
                <Input value={selectedClip.label} onChange={(e) => updateSelectedClip({ label: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start</Label>
                  <Input type="number" min={0} value={selectedClip.start} onChange={(e) => updateSelectedClip({ start: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Input type="number" min={1} value={selectedClip.duration} onChange={(e) => updateSelectedClip({ duration: Number(e.target.value) })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Transition</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={selectedClip.transition || 'none'}
                  onChange={(e) => updateSelectedClip({ transition: e.target.value as TransitionType })}
                >
                  <option value="none">None</option>
                  <option value="cut">Cut</option>
                  <option value="dissolve">Dissolve</option>
                  <option value="fade">Fade</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Effect</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={selectedClip.effect || 'none'}
                  onChange={(e) => updateSelectedClip({ effect: e.target.value as EffectType })}
                >
                  <option value="none">None</option>
                  <option value="cinematic">Cinematic</option>
                  <option value="vintage">Vintage</option>
                  <option value="high-contrast">High Contrast</option>
                </select>
              </div>
              {selectedClip.track === 'text' && (
                <div className="space-y-2">
                  <Label>Text Content</Label>
                  <Textarea value={selectedClip.text || ''} onChange={(e) => updateSelectedClip({ text: e.target.value })} rows={3} />
                </div>
              )}
              {selectedClip.track === 'audio' && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Volume2 className="h-4 w-4" />Volume (%)</Label>
                  <Input type="number" min={0} max={200} value={selectedClip.volume || 80} onChange={(e) => updateSelectedClip({ volume: Number(e.target.value) })} />
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Select a clip in the timeline.</p>
          )}

          <Separator />
          <div className="space-y-2">
            <Label>Export Preset</Label>
            <Input defaultValue="H.264 - 1080p - 20Mbps - AAC" />
          </div>
          <div className="space-y-2">
            <Label>Filename</Label>
            <Input defaultValue="final-cut-v1.mp4" />
          </div>
          <Button className="w-full" onClick={queueRender}>
            <Download className="mr-2 h-4 w-4" /> Queue Render
          </Button>

          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Wand2 className="h-4 w-4" />Render Queue</Label>
            {renderJobs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No render jobs yet.</p>
            ) : (
              <div className="space-y-2">
                {renderJobs.map((job) => (
                  <div key={job.id} className="border rounded-md p-2">
                    <p className="text-xs font-medium">{job.name}</p>
                    <p className="text-[11px] text-muted-foreground capitalize">{job.status}</p>
                    <div className="mt-1 h-1.5 bg-muted rounded">
                      <div className={`h-1.5 rounded ${job.status === 'completed' ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${job.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

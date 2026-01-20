
'use client';

import { useState, useRef, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Film, Type, UploadCloud, Download, Play, Pause, FilePenLine, Sparkles, Bot, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import Link from 'next/link';
import { suggestBroll, fetchStockVideos } from '@/server/ai/flows/suggest-b-roll';
import type { StockVideoResult } from '@/server/ai/flows/suggest-b-roll';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/auth-context';
import type { BrandKit } from '@/server/actions/user-actions';
import { getBrandKit } from '@/server/actions/user-actions';


interface Scene {
  id: number;
  type: 'video' | 'image';
  src: string;
  duration: number; // in seconds
  caption: {
    text: string;
    position: 'bottom' | 'top' | 'middle';
  };
}

const initialScenes: Scene[] = [
  { id: 1, type: 'video', src: 'https://placehold.co/1920x1080.png', duration: 5, caption: { text: 'Welcome to our presentation!', position: 'bottom' } },
];

export default function VideoEditorPage() {
    const { toast } = useToast();
    const [scenes, setScenes] = useState<Scene[]>(initialScenes);
    const [selectedSceneId, setSelectedSceneId] = useState<number | null>(1);
    const [isPlaying, setIsPlaying] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const brollInputRef = useRef<HTMLInputElement>(null);

    const [brollSuggestions, setBrollSuggestions] = useState<string[]>([]);
    const [suggestIsPending, startSuggestTransition] = useTransition();
    const [mediaBin, setMediaBin] = useState<StockVideoResult[]>([]);
    const [fetchIsPending, startFetchTransition] = useTransition();
    const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
    const [blobUrls, setBlobUrls] = useState<string[]>([]);
    const { subscriptionPlan } = useAuth();

    useEffect(() => {
        const loadBrandKit = async () => {
            const kit = await getBrandKit();
            if (kit) {
                setBrandKit(kit);
            }
        };
        loadBrandKit();
        
        return () => {
            blobUrls.forEach(url => URL.revokeObjectURL(url));
        };
    }, [blobUrls]);

    const selectedScene = scenes.find(s => s.id === selectedSceneId) || null;

    const addScene = () => {
        const newScene: Scene = {
            id: Date.now(),
            type: 'image',
            src: 'https://placehold.co/1920x1080.png',
            duration: 4,
            caption: { text: 'New Scene', position: 'bottom' },
        };
        setScenes([...scenes, newScene]);
        setSelectedSceneId(newScene.id);
    };
    
    const removeScene = (id: number) => {
        setScenes(scenes.filter(s => s.id !== id));
        if (selectedSceneId === id) {
            setSelectedSceneId(scenes.length > 1 ? scenes[0].id : null);
        }
    };

    const handleCaptionChange = (text: string) => {
        if (!selectedScene) return;
        const updatedScenes = scenes.map(s => s.id === selectedScene.id ? { ...s, caption: { ...s.caption, text } } : s);
        setScenes(updatedScenes);
    };

    const handleBrollUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            const thumbnail = file.type.startsWith('image') ? URL.createObjectURL(file) : 'https://placehold.co/400x300.png?text=Video';
            const newMediaItem: StockVideoResult = {
                id: `local-${Date.now()}`,
                url,
                thumbnail,
                description: file.name,
                photographer: "Local file",
            };
            setMediaBin(prev => [newMediaItem, ...prev]);
            setBlobUrls(prev => [...prev, url, thumbnail]);
            toast({ title: 'B-Roll Added', description: `${file.name} has been added to your media bin.` });
        }
    };
    
    const handleSuggestBroll = () => {
        if (!selectedScene?.caption.text) {
            toast({ variant: 'destructive', title: 'Cannot Suggest', description: 'Please add a caption to the selected scene first.'});
            return;
        }
        startSuggestTransition(async () => {
            setBrollSuggestions([]);
            try {
                const result = await suggestBroll({ script: selectedScene.caption.text });
                setBrollSuggestions(result.suggestions);
            } catch (e) {
                 const error = e as Error;
                 toast({ variant: 'destructive', title: 'Suggestion Failed', description: error.message });
            }
        });
    }

    const handleFetchStockVideos = (searchTerm: string) => {
        startFetchTransition(async () => {
            try {
                const result = await fetchStockVideos({ searchTerm });
                setMediaBin(prev => [...result.videos, ...prev]);
                toast({ title: 'Media Added', description: `Added ${result.videos.length} clips for "${searchTerm}" to your bin.`})
            } catch (e) {
                const error = e as Error;
                toast({ variant: 'destructive', title: 'Error', description: error.message })
            }
        });
    }


    const handlePlayPause = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
                setIsPlaying(false);
            } else {
                videoRef.current.play();
                setIsPlaying(true);
            }
        }
    }

  return (
    <div className="grid lg:grid-cols-12 gap-6 items-start h-full">
        {/* Main Canvas & Timeline */}
        <div className="lg:col-span-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Video Preview</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="aspect-video bg-black rounded-lg relative flex items-center justify-center">
                        {selectedScene ? (
                            selectedScene.type === 'video' ? (
                                <video
                                    ref={videoRef}
                                    src={selectedScene.src}
                                    className="w-full h-full object-contain rounded-lg"
                                    onPlay={() => setIsPlaying(true)}
                                    onPause={() => setIsPlaying(false)}
                                    onEnded={() => setIsPlaying(false)}
                                />
                            ) : (
                                <Image src={selectedScene.src} data-ai-hint="placeholder" fill objectFit="contain" alt="Scene preview" />
                            )
                        ) : (
                            <p className="text-muted-foreground">Select a scene to preview</p>
                        )}
                        {selectedScene && selectedScene.caption.text && (
                            <div className="absolute bottom-4 left-4 right-4 p-2 bg-black/50 text-white text-center rounded-md text-xl font-bold" style={{ fontFamily: brandKit?.headlineFont || 'Poppins' }}>
                                {selectedScene.caption.text}
                            </div>
                        )}
                        <div className="absolute bottom-2 left-2 flex gap-2">
                             <Button size="icon" onClick={handlePlayPause}>
                                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="w-full whitespace-nowrap pb-4">
                        <div className="flex items-center gap-2 h-28">
                            {scenes.map(scene => (
                                <div 
                                    key={scene.id} 
                                    className={`h-full rounded-lg border-2 flex-shrink-0 cursor-pointer ${selectedSceneId === scene.id ? 'border-primary' : 'border-transparent'}`}
                                    onClick={() => setSelectedSceneId(scene.id)}
                                    style={{ width: `${scene.duration * 2}rem` }}
                                >
                                    <div className="relative h-full w-full bg-muted rounded-md overflow-hidden">
                                        <Image src={scene.src} data-ai-hint="placeholder" fill objectFit="cover" alt={`Scene ${scene.id}`} />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent p-1 flex flex-col justify-end">
                                            <p className="text-white text-xs truncate">{scene.caption.text || `Scene ${scene.id}`}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                             <Button variant="outline" size="icon" className="h-24 w-24 flex-shrink-0" onClick={addScene}>
                                <Plus className="h-6 w-6" />
                            </Button>
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>

        {/* Control Panel */}
        <div className="lg:col-span-4 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Editor</CardTitle>
                    <CardDescription>Edit scene properties or use AI tools.</CardDescription>
                </CardHeader>
                 <CardContent>
                     <Button className="w-full" asChild>
                        <Link href="/dashboard/video-editor/transcript-editor">
                           <FilePenLine className="mr-2 h-4 w-4" /> Edit with Transcript
                        </Link>
                    </Button>
                </CardContent>
                <CardContent className="space-y-4">
                    {selectedScene ? (
                        <>
                            <div>
                                <Label htmlFor="caption-text">Caption Text</Label>
                                <Textarea 
                                    id="caption-text" 
                                    value={selectedScene.caption.text}
                                    onChange={(e) => handleCaptionChange(e.target.value)}
                                    placeholder="Enter caption for this scene"
                                />
                            </div>
                            <div>
                                <Label htmlFor="duration">Scene Duration (seconds)</Label>
                                <Input 
                                    id="duration" 
                                    type="number"
                                    value={selectedScene.duration}
                                    onChange={(e) => setScenes(scenes.map(s => s.id === selectedSceneId ? { ...s, duration: Number(e.target.value) } : s))}
                                />
                            </div>
                            <Button variant="destructive" className="w-full" onClick={() => removeScene(selectedScene.id)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Scene
                            </Button>
                        </>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center">Select a scene from the timeline to edit.</p>
                    )}
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>AI B-Roll Suggestions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <Button className="w-full" variant="outline" onClick={handleSuggestBroll} disabled={!selectedScene || suggestIsPending}>
                        {suggestIsPending ? <Sparkles className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                        Suggest B-Roll for Scene
                    </Button>
                    {brollSuggestions.length > 0 && (
                        <div className="space-y-2">
                            <Label>Click to find videos:</Label>
                            <div className="flex flex-wrap gap-2">
                                {brollSuggestions.map(term => (
                                    <Button key={term} variant="secondary" size="sm" onClick={() => handleFetchStockVideos(term)} disabled={fetchIsPending}>
                                        {fetchIsPending ? <Loader2 className="h-4 w-4 animate-spin" /> : term}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Media Bin</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button className="w-full" variant="outline" onClick={() => brollInputRef.current?.click()}>
                        <UploadCloud className="mr-2 h-4 w-4" /> Upload Media
                    </Button>
                     <Input type="file" className="hidden" ref={brollInputRef} onChange={handleBrollUpload} accept="image/*,video/*" />
                     
                     <ScrollArea className="h-48">
                        <div className="space-y-2 pr-4">
                            {fetchIsPending ? (
                                Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                            ) : mediaBin.length > 0 ? (
                                mediaBin.map(item => (
                                    <div key={item.id} className="flex items-center gap-2 p-2 border rounded-md">
                                        <Image src={item.thumbnail} data-ai-hint="stock video" alt={item.description} width={64} height={48} className="object-cover rounded aspect-video bg-muted" />
                                        <p className="text-xs text-muted-foreground flex-1 truncate">{item.description}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-xs text-muted-foreground py-4">Upload or generate media to see it here.</p>
                            )}
                        </div>
                     </ScrollArea>
                </CardContent>
            </Card>
            
            <Button size="lg" className="w-full">
                <Download className="mr-2 h-4 w-4" /> Export Video
            </Button>
        </div>
    </div>
  );
}

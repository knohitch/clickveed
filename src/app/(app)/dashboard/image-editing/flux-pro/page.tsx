
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { UploadCloud, Download, RefreshCw, Palette, Type, Settings } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAdminSettings } from '@/contexts/admin-settings-context';

// Default filter state
const initialFilters = {
    brightness: 100,
    contrast: 100,
    saturate: 100,
    grayscale: 0,
    blur: 0,
    hueRotate: 0,
};

// Default text state
const initialTextState = {
    content: 'AI Video Creator',
    color: '#ffffff',
    size: 50,
    x: 50,
    y: 50,
};

export default function FluxProPage() {
    const { appName } = useAdminSettings();
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [filters, setFilters] = useState(initialFilters);
    const [text, setText] = useState(initialTextState);
    const [isTextActive, setIsTextActive] = useState(false);

    useEffect(() => {
        setText(prev => ({ ...prev, content: appName || 'AI Video Creator' }));
    }, [appName]);

    const applyFilters = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !image) return;

        if (canvas) {
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
        }
        
        const filterString = `
            brightness(${filters.brightness}%)
            contrast(${filters.contrast}%)
            saturate(${filters.saturate}%)
            grayscale(${filters.grayscale}%)
            blur(${filters.blur}px)
            hue-rotate(${filters.hueRotate}deg)
        `;

        ctx.filter = filterString;
        ctx.drawImage(image, 0, 0);

        if (isTextActive) {
            ctx.filter = 'none'; // Reset filter for text drawing
            ctx.font = `${text.size}px Arial`;
            ctx.fillStyle = text.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            if (canvas) {
                ctx.fillText(text.content, canvas.width * (text.x / 100), canvas.height * (text.y / 100));
            }
        }

    }, [image, filters, text, isTextActive]);

    useEffect(() => {
        if (image) {
            applyFilters();
        }
    }, [image, filters, text, applyFilters, isTextActive]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    setImage(img);
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleFilterChange = (filterName: keyof typeof initialFilters, value: number) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
    };

    const handleTextChange = (prop: keyof typeof initialTextState, value: string | number) => {
        setText(prev => ({ ...prev, [prop]: value }));
    };

    const resetAll = () => {
        setFilters(initialFilters);
        setText(initialTextState);
        setIsTextActive(false);
    };

    const handlePresetFilter = (preset: 'sepia' | 'vintage' | 'bw' | 'cool' | 'warm' | 'dramatic') => {
        switch (preset) {
            case 'sepia':
                setFilters({ ...initialFilters, saturate: 20, brightness: 120, contrast: 90 });
                break;
            case 'vintage':
                setFilters({ ...initialFilters, saturate: 80, brightness: 90, contrast: 120, grayscale: 20 });
                break;
            case 'bw':
                setFilters({ ...initialFilters, grayscale: 100, contrast: 120 });
                break;
            case 'cool':
                setFilters({ ...initialFilters, saturate: 150, hueRotate: -10 });
                break;
            case 'warm':
                setFilters({ ...initialFilters, saturate: 150, hueRotate: 10 });
                break;
            case 'dramatic':
                setFilters({ ...initialFilters, contrast: 150, saturate: 130 });
                break;
        }
    };


    const downloadImage = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const link = document.createElement('a');
            link.download = 'edited-image.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        }
    };

    return (
        <div className="grid lg:grid-cols-12 gap-6 items-start h-full">
            {/* Main Canvas Area */}
            <div className="lg:col-span-9">
                <Card className="h-full">
                     <CardContent className="p-4 flex items-center justify-center h-[calc(100vh-14rem)]">
                        {image ? (
                            <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />
                        ) : (
                            <label htmlFor="image-upload" className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted">
                                <UploadCloud className="w-16 h-16 text-muted-foreground" />
                                <p className="mt-4 text-lg font-semibold">Upload an image to start editing</p>
                                <p className="text-muted-foreground">PNG, JPG, or WEBP</p>
                                <Input id="image-upload" type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
                            </label>
                        )}
                    </CardContent>
                </Card>
            </div>
            
            {/* Control Panel */}
            <div className="lg:col-span-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Flux Pro Editor</CardTitle>
                        <CardDescription>Adjust, filter, and add text to your image.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Button onClick={downloadImage} disabled={!image} className="flex-1">
                                <Download className="mr-2 h-4 w-4"/> Download
                            </Button>
                             <Button onClick={resetAll} disabled={!image} variant="outline" className="flex-1">
                                <RefreshCw className="mr-2 h-4 w-4"/> Reset
                            </Button>
                        </div>
                        
                        <Accordion type="multiple" defaultValue={['adjustments']} className="w-full">
                            <AccordionItem value="adjustments">
                                <AccordionTrigger><Settings className="mr-2 h-4 w-4"/> Adjustments</AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-2">
                                    <div className="space-y-2">
                                        <Label>Brightness ({filters.brightness}%)</Label>
                                        <Slider value={[filters.brightness]} onValueChange={(v) => handleFilterChange('brightness', v[0])} max={200} step={1} disabled={!image} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Contrast ({filters.contrast}%)</Label>
                                        <Slider value={[filters.contrast]} onValueChange={(v) => handleFilterChange('contrast', v[0])} max={200} step={1} disabled={!image} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Saturation ({filters.saturate}%)</Label>
                                        <Slider value={[filters.saturate]} onValueChange={(v) => handleFilterChange('saturate', v[0])} max={200} step={1} disabled={!image} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Grayscale ({filters.grayscale}%)</Label>
                                        <Slider value={[filters.grayscale]} onValueChange={(v) => handleFilterChange('grayscale', v[0])} max={100} step={1} disabled={!image} />
                                    </div>
                                     <div className="space-y-2">
                                        <Label>Blur ({filters.blur}px)</Label>
                                        <Slider value={[filters.blur]} onValueChange={(v) => handleFilterChange('blur', v[0])} max={20} step={1} disabled={!image} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Hue Rotate ({filters.hueRotate}°)</Label>
                                        <Slider value={[filters.hueRotate]} onValueChange={(v) => handleFilterChange('hueRotate', v[0])} max={360} step={1} disabled={!image} />
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="filters">
                                <AccordionTrigger><Palette className="mr-2 h-4 w-4"/> Filters</AccordionTrigger>
                                <AccordionContent className="grid grid-cols-2 gap-2 pt-2">
                                    <Button variant="outline" onClick={() => handlePresetFilter('sepia')} disabled={!image}>Sepia</Button>
                                    <Button variant="outline" onClick={() => handlePresetFilter('vintage')} disabled={!image}>Vintage</Button>
                                    <Button variant="outline" onClick={() => handlePresetFilter('bw')} disabled={!image}>B & W</Button>
                                    <Button variant="outline" onClick={() => handlePresetFilter('cool')} disabled={!image}>Cool</Button>
                                    <Button variant="outline" onClick={() => handlePresetFilter('warm')} disabled={!image}>Warm</Button>
                                    <Button variant="outline" onClick={() => handlePresetFilter('dramatic')} disabled={!image}>Dramatic</Button>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="text">
                                <AccordionTrigger><Type className="mr-2 h-4 w-4"/> Add Text</AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-2">
                                     <div className="flex items-center space-x-2">
                                        <Input
                                            type="checkbox"
                                            id="text-active"
                                            checked={isTextActive}
                                            onChange={(e) => setIsTextActive(e.target.checked)}
                                            className="h-4 w-4"
                                            disabled={!image}
                                        />
                                        <Label htmlFor="text-active" className="font-normal">Enable Text Overlay</Label>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Text Content</Label>
                                        <Input value={text.content} onChange={(e) => handleTextChange('content', e.target.value)} disabled={!image || !isTextActive}/>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Text Color</Label>
                                        <Input type="color" value={text.color} onChange={(e) => handleTextChange('color', e.target.value)} disabled={!image || !isTextActive} className="h-10"/>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Font Size ({text.size}px)</Label>
                                        <Slider value={[text.size]} onValueChange={(v) => handleTextChange('size', v[0])} min={10} max={200} step={1} disabled={!image || !isTextActive}/>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>X Position ({text.x}%)</Label>
                                        <Slider value={[text.x]} onValueChange={(v) => handleTextChange('x', v[0])} min={0} max={100} step={1} disabled={!image || !isTextActive}/>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Y Position ({text.y}%)</Label>
                                        <Slider value={[text.y]} onValueChange={(v) => handleTextChange('y', v[0])} min={0} max={100} step={1} disabled={!image || !isTextActive}/>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

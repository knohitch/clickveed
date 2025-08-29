
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { upsertBrandKit, type BrandKit as BrandKitType } from "@/server/actions/user-actions";
import { Palette, UploadCloud, Type, Save, Trash2, Loader2, Image as ImageIcon } from "lucide-react";
import Image from 'next/image';

const FontSelector = ({ label, value, onChange }: { label: string, value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void }) => {
    const googleFonts = [
        "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", "Nunito", "Oswald",
        "Raleway", "Merriweather", "Playfair Display", "Inter"
    ];

    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <select
                value={value}
                onChange={onChange}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {googleFonts.map(font => (
                    <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                ))}
            </select>
        </div>
    );
};

export default function BrandKitPage() {
    const { toast } = useToast();
    const [brandKit, setBrandKit] = useState<Partial<BrandKitType>>({});
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchBrandKit = async () => {
            setLoading(true);
            const kit = await upsertBrandKit({}); // Will fetch or create empty
            if (kit) {
                setBrandKit(kit);
            }
            setLoading(false);
        };
        fetchBrandKit();
    }, []);

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setBrandKit(prev => ({ ...prev, [name]: value }));
    };

    const handleFontChange = (e: React.ChangeEvent<HTMLSelectElement>, type: 'headlineFont' | 'bodyFont') => {
        setBrandKit(prev => ({ ...prev, [type]: e.target.value }));
    };
    
    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target?.result as string;
                setBrandKit(prev => ({ ...prev, logoUrl: dataUrl }));
            }
            reader.readAsDataURL(file);
        }
    };
    
    const handleRemoveLogo = () => {
        setBrandKit(prev => ({ ...prev, logoUrl: null }));
    }

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await upsertBrandKit(brandKit);
            toast({ title: "Brand Kit Saved", description: "Your branding has been updated." });
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Failed to save brand kit." });
        } finally {
            setIsSaving(false);
        }
    };
    
    if (loading) {
        return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Brand Kit</CardTitle>
                <CardDescription>
                    Define your brand's visual identity. Your logo, colors, and fonts will be available in the video editor.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2"><ImageIcon className="h-5 w-5"/> Logo</h3>
                    <div className="flex items-center gap-4">
                        <div 
                            className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50 cursor-pointer hover:bg-muted"
                            onClick={() => logoInputRef.current?.click()}
                        >
                            {brandKit.logoUrl ? (
                                <Image src={brandKit.logoUrl} alt="Brand Logo" width={96} height={96} className="object-contain p-2"/>
                            ) : (
                                <UploadCloud className="h-8 w-8 text-muted-foreground" />
                            )}
                        </div>
                         <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">Upload your brand logo. Recommended format: PNG with transparent background.</p>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()}>Upload Logo</Button>
                                {brandKit.logoUrl && <Button type="button" variant="destructive" size="icon" onClick={handleRemoveLogo}><Trash2 className="h-4 w-4"/></Button>}
                            </div>
                            <input type="file" ref={logoInputRef} onChange={handleLogoChange} className="hidden" accept="image/*" />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2"><Palette className="h-5 w-5" /> Brand Colors</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="primaryColor">Primary Color</Label>
                            <div className="flex items-center gap-2">
                                <Input type="color" name="primaryColor" id="primaryColor" value={brandKit.primaryColor || '#000000'} onChange={handleColorChange} className="w-12 h-10 p-1"/>
                                <Input type="text" value={brandKit.primaryColor || '#000000'} onChange={handleColorChange} name="primaryColor" />
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="secondaryColor">Secondary Color</Label>
                            <div className="flex items-center gap-2">
                                <Input type="color" name="secondaryColor" id="secondaryColor" value={brandKit.secondaryColor || '#ffffff'} onChange={handleColorChange} className="w-12 h-10 p-1"/>
                                <Input type="text" value={brandKit.secondaryColor || '#ffffff'} onChange={handleColorChange} name="secondaryColor" />
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="accentColor">Accent Color</Label>
                            <div className="flex items-center gap-2">
                                <Input type="color" name="accentColor" id="accentColor" value={brandKit.accentColor || '#3b82f6'} onChange={handleColorChange} className="w-12 h-10 p-1"/>
                                <Input type="text" value={brandKit.accentColor || '#3b82f6'} onChange={handleColorChange} name="accentColor" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2"><Type className="h-5 w-5"/> Brand Fonts</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FontSelector label="Headline Font" value={brandKit.headlineFont || 'Poppins'} onChange={(e) => handleFontChange(e, 'headlineFont')} />
                        <FontSelector label="Body Font" value={brandKit.bodyFont || 'Nunito'} onChange={(e) => handleFontChange(e, 'bodyFont')} />
                    </div>
                </div>
                
                 <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Brand Kit
                    </Button>
                </div>

            </CardContent>
        </Card>
    )
}

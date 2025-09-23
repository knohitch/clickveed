

"use client";

import { useRef, useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, UserRoundPlus, FileAudio, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from './ui/badge';
import { createVoiceCloneAction } from '@/lib/actions';

const initialState = {
  message: '',
  result: undefined,
  errors: {},
};

export function VoiceCloningStudio() {
    const { toast } = useToast();
    const [state, formAction] = useFormState(createVoiceCloneAction, initialState);
    const formRef = useRef<HTMLFormElement>(null);
    const [files, setFiles] = useState<File[]>([]);
    const { pending: isSubmitting } = useFormStatus();

    useEffect(() => {
        if (state.message === 'success' && state.result) {
            toast({
                title: 'Success!',
                description: (state.result as { message: string }).message,
            });
            formRef.current?.reset();
            setFiles([]);
        } else if (state.message && state.message !== 'success' && state.message !== 'Validation failed') {
            toast({
                variant: "destructive",
                title: "Error Creating Voice Clone",
                description: state.message,
            });
        }
    }, [state, toast]);

    const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        
        const formData = new FormData(event.currentTarget);
        const uploadPromises = files.map(async file => {
            const uploadResponse = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: file.name, contentType: file.type }),
            });
            const { uploadUrl, publicUrl } = await uploadResponse.json();
            await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
            return publicUrl;
        });

        const fileUrls = await Promise.all(uploadPromises);
        fileUrls.forEach(url => formData.append('fileUrls', url));
        
        formAction(formData);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            const validFiles = newFiles.filter(file => file.type.startsWith('audio/'));
            if(validFiles.length !== newFiles.length) {
                toast({
                    variant: "destructive",
                    title: "Invalid File Type",
                    description: "Please upload only audio files (e.g., MP3, WAV).",
                });
            }
            
            setFiles(prev => [...prev, ...validFiles]);
            
            if (e.target) e.target.value = ""; // Clear file input
        }
    };

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const totalSize = files.reduce((acc, file) => acc + file.size, 0);
    const totalDurationApproximation = totalSize / (128 * 1024) * 60; // Rough estimate

    return (
        <form ref={formRef} onSubmit={handleFormSubmit} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="voiceName">Name Your Voice</Label>
                <Input id="voiceName" name="voiceName" placeholder="e.g., 'My Voice'" required/>
                {'voiceName' in state.errors && <p className="text-sm text-destructive">{state.errors.voiceName?.[0]}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="audio-upload">Upload Audio Samples</Label>
                <div className="flex items-center justify-center w-full">
                    <label htmlFor="audio-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                            <p className="mb-2 text-sm text-muted-foreground">
                                <span className="font-semibold">Click to upload</span>
                            </p>
                            <p className="text-xs text-muted-foreground">MP3, WAV, or M4A (MIN. 30 seconds total)</p>
                        </div>
                        <Input 
                            id="audio-upload"
                            type="file" 
                            className="hidden" 
                            onChange={handleFileChange}
                            accept="audio/*"
                            multiple
                            disabled={isSubmitting}
                        />
                    </label>
                </div>
                {'fileUrls' in state.errors && <p className="text-sm text-destructive">{state.errors.fileUrls?.[0]}</p>}
            </div>

            {files.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Uploaded Samples</CardTitle>
                        <CardDescription>
                            Review your uploaded files. We recommend at least 30 seconds of clear audio.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {files.map((file, index) => (
                            <div key={`${file.name}-${index}`} className="flex items-center justify-between p-2 rounded-md border">
                                <div className="flex items-center gap-3">
                                    <FileAudio className="h-5 w-5 text-primary" />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">{file.name}</span>
                                        <span className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                    </div>
                                </div>
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeFile(index)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        <div className="text-sm text-center text-muted-foreground pt-2">
                            Total audio length is approximately <Badge variant="secondary">{Math.floor(totalDurationApproximation / 60)}m {Math.round(totalDurationApproximation % 60)}s</Badge>.
                        </div>
                    </CardContent>
                </Card>
            )}

            <Button type="submit" disabled={files.length === 0 || isSubmitting} className="w-full">
                {isSubmitting ? <Sparkles className="mr-2 h-4 w-4 animate-spin" /> : <UserRoundPlus className="mr-2 h-4 w-4" />}
                {isSubmitting ? "Submitting for Cloning..." : "Create Voice Clone"}
            </Button>
        </form>
    );
}



'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { analyzeThumbnailsAction } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, CheckCircle, Sparkles, ThumbsUp, UploadCloud, XCircle, RefreshCcw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';
import { Progress } from './ui/progress';
import type { AnalyzeThumbnailsOutput } from '@/server/ai/flows/analyze-thumbnails';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

type ThumbnailActionState = {
  message: string;
  analysis: any; // We'll keep this as 'any' for now since we don't have the exact type
  errors: {
    thumbnailA_Url?: string[];
    thumbnailB_Url?: string[];
    videoTitle?: string[];
    targetAudience?: string[];
  };
};

const initialState: ThumbnailActionState = {
  message: '',
  analysis: null,
  errors: {},
};


function ThumbnailUploader({ id, label, preview, onFileChange, error, disabled }: { id: string, label: string, preview: string | null, onFileChange: (file: File | null) => void, error?: string, disabled: boolean }) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleInternalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        onFileChange(file);
    };

    const triggerFileSelect = () => {
        if (!disabled) {
            inputRef.current?.click();
        }
    }

    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            <div 
                className={cn(
                    "aspect-video w-full border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50 transition-colors", 
                    !disabled && "cursor-pointer hover:bg-muted",
                    error && "border-destructive",
                    disabled && "cursor-not-allowed"
                )}
                onClick={triggerFileSelect}
            >
                {preview ? (
                    <Image src={preview} alt="Thumbnail preview" width={320} height={180} className="object-contain h-full w-full rounded-md" />
                ) : (
                    <div className="text-center text-muted-foreground p-4">
                        <UploadCloud className="mx-auto h-8 w-8 mb-2" />
                        <p className="text-sm font-semibold">Click to upload</p>
                        <p className="text-xs">1280x720 recommended</p>
                    </div>
                )}
            </div>
            <Input 
                id={id} 
                name={id}
                type="file" 
                ref={inputRef} 
                className="hidden" 
                onChange={handleInternalFileChange}
                accept="image/png,image/jpeg,image/webp"
                disabled={disabled}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
}

const AnalysisCard = ({ title, analysis, isWinner }: { title: string, analysis: AnalyzeThumbnailsOutput['analysisA'], isWinner: boolean}) => {
    return (
        <Card className={cn("transition-all", isWinner && "border-primary ring-2 ring-primary")}>
            <CardHeader>
                <CardTitle className='flex justify-between items-center'>
                    {title}
                    {isWinner && <Badge><CheckCircle className="h-4 w-4 mr-1.5" /> Recommended</Badge>}
                </CardTitle>
                <CardDescription>{analysis.summary}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <Label>Engagement Score</Label>
                        <span className="font-bold text-lg">{analysis.score}/100</span>
                    </div>
                    <Progress value={analysis.score} />
                </div>
                <div>
                    <h4 className="font-semibold flex items-center gap-2 mb-2"><ThumbsUp className="h-4 w-4 text-green-500" /> Pros</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                        {analysis.pros.map((pro, i) => <li key={i}>{pro}</li>)}
                    </ul>
                </div>
                 <div>
                    <h4 className="font-semibold flex items-center gap-2 mb-2"><XCircle className="h-4 w-4 text-destructive" /> Cons</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                        {analysis.cons.map((con, i) => <li key={i}>{con}</li>)}
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
    const { pending } = useFormStatus();
    const isDisabled = pending || disabled;
    return (
        <Button type="submit" size="lg" disabled={isDisabled}>
            {pending ? <Sparkles className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
            {pending ? 'Analyzing...' : 'Analyze Thumbnails'}
        </Button>
    )
}

export function ThumbnailTester() {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  
  const [state, formAction] = useFormState<ThumbnailActionState, FormData>(analyzeThumbnailsAction, initialState);

  const [fileA, setFileA] = useState<File | null>(null);
  const [previewA, setPreviewA] = useState<string | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [previewB, setPreviewB] = useState<string | null>(null);

  useEffect(() => {
    if (state.message === 'success' && state.analysis) {
        toast({ title: "Analysis Complete!", description: "The AI has provided feedback on your thumbnails." });
    } else if (state.message && state.message !== 'Validation failed') {
        toast({
            variant: "destructive",
            title: "Error",
            description: state.message,
        });
    }
  }, [state, toast]);


  const handleFileChange = (setter: React.Dispatch<React.SetStateAction<string | null>>, fileHandler: React.Dispatch<React.SetStateAction<File | null>>) => (file: File | null) => {
    fileHandler(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setter(null);
    }
  };

  const handleReset = () => {
    setFileA(null);
    setFileB(null);
    setPreviewA(null);
    setPreviewB(null);
    formRef.current?.reset();
    // This will reset the action state, clearing errors and results.
    formAction(new FormData());
  }

  const analysisResult = state.analysis;

  return (
    <div className="space-y-8">
        <form ref={formRef} action={formAction} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <ThumbnailUploader id="thumbnailA" label="Thumbnail A" preview={previewA} onFileChange={handleFileChange(setPreviewA, setFileA)} error={state.errors?.thumbnailA_Url?.[0]} disabled={false} />
                <ThumbnailUploader id="thumbnailB" label="Thumbnail B" preview={previewB} onFileChange={handleFileChange(setPreviewB, setFileB)} error={state.errors?.thumbnailB_Url?.[0]} disabled={false} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Video Context</CardTitle>
                    <CardDescription>Provide context for a more accurate analysis.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="videoTitle">Video Title</Label>
                        <Input id="videoTitle" name="videoTitle" placeholder="e.g., How I Built a SAAS Business in 30 Days" required />
                        {state.errors?.videoTitle && <p className="text-sm text-destructive">{state.errors.videoTitle[0]}</p>}
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="targetAudience">Target Audience</Label>
                        <Textarea id="targetAudience" name="targetAudience" placeholder="e.g., Aspiring entrepreneurs and developers interested in indie hacking and startups." required />
                        {state.errors?.targetAudience && <p className="text-sm text-destructive">{state.errors.targetAudience[0]}</p>}
                    </div>
                </CardContent>
            </Card>
            {!analysisResult && (
                <div className="flex justify-center">
                    <SubmitButton disabled={!fileA || !fileB}/>
                </div>
            )}
        </form>
        
        {(analysisResult) && (
            <div className="space-y-8">
                <div className="relative">
                    <Separator />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="bg-card px-4 text-muted-foreground font-semibold">AI Analysis</span>
                    </div>
                </div>

                <div className="space-y-6">
                        <Card className="bg-muted">
                            <CardHeader className="text-center">
                                <CardTitle>Recommendation: Thumbnail {analysisResult.recommendation}</CardTitle>
                                <CardDescription>{analysisResult.reasoning}</CardDescription>
                            </CardHeader>
                        </Card>
                        <div className="grid md:grid-cols-2 gap-8 items-start">
                            <AnalysisCard title="Thumbnail A Analysis" analysis={analysisResult.analysisA} isWinner={analysisResult.recommendation === 'A'} />
                            <AnalysisCard title="Thumbnail B Analysis" analysis={analysisResult.analysisB} isWinner={analysisResult.recommendation === 'B'} />
                        </div>
                        <div className='flex justify-center'>
                             <Button onClick={handleReset} size="lg" variant="outline">
                                <RefreshCcw className="mr-2 h-4 w-4" />
                                Test Another Pair
                            </Button>
                        </div>
                    </div>
                
            </div>
        )}
    </div>
  );
}

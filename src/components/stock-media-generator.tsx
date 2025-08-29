

"use client";

import { useState, useRef, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { generateStockMediaAction } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Download, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Skeleton } from './ui/skeleton';
import { Card, CardContent } from './ui/card';

const initialState = {
    message: '',
    images: [],
    errors: { prompt: [] },
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Sparkles className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
      {pending ? 'Generating...' : 'Generate'}
    </Button>
  );
}

export function StockMediaGenerator() {
  const { toast } = useToast();
  const [state, formAction] = useFormState(generateStockMediaAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const { pending } = useFormStatus();
  
  useEffect(() => {
    if (state.message === 'success' && state.images) {
      setImages(state.images);
      formRef.current?.reset();
    } else if (state.message && state.message !== 'success' && state.message !== 'Validation failed') {
      toast({
        variant: "destructive",
        title: "Error Generating Media",
        description: state.message,
      });
    }
  }, [state, toast]);

  // When a new form action starts, clear the old images to show the loading state.
  useEffect(() => {
      if (pending) {
          setImages([]);
      }
  }, [pending]);

  return (
    <div className="space-y-6">
      <form ref={formRef} action={formAction} className="space-y-2">
        <div className="flex gap-2">
            <Input 
              name="prompt" 
              placeholder="e.g., 'A person working on a laptop in a modern, sunlit office'" 
              required 
              className="flex-1"
            />
            <SubmitButton />
        </div>
        {state.errors?.prompt && <p className="text-sm text-destructive mt-1">{state.errors.prompt[0]}</p>}
       </form>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pending ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="aspect-square w-full rounded-lg overflow-hidden">
                    <Skeleton className="h-full w-full" />
                </div>
              ))
            ) : images.length > 0 ? (
              images.map((img, index) => (
                <div key={index} className="group relative aspect-square w-full rounded-lg overflow-hidden">
                  <Image
                    src={img}
                    alt={`Generated stock media ${index + 1}`}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <Button asChild size="icon">
                        <a href={img} download={`stock-image-${index}.png`}>
                            <Download className="h-5 w-5" />
                        </a>
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center text-muted-foreground p-8 border-2 border-dashed rounded-md">
                <ImageIcon className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-semibold">Generated Images Will Appear Here</h3>
                <p>Enter a prompt above to create your first set of images.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

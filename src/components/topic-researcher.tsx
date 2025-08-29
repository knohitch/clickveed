

"use client";

import { useEffect, useState, useTransition } from 'react';
import { useFormState } from 'react-dom';
import { researchVideoTopicAction } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Bot, Lightbulb, Sparkles, TrendingUp, ThumbsUp, ChevronsRight, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { Badge } from './ui/badge';
import type { ResearchVideoTopicOutput } from '@/server/ai/flows/research-video-topic';
import { Separator } from './ui/separator';

const initialState = {
  message: '',
  ideas: [],
  errors: {},
};

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? <Sparkles className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
      Research Topic
    </Button>
  );
}

const IdeaCard = ({ idea, index }: { idea: ResearchVideoTopicOutput['ideas'][0], index: number }) => {
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-lg">{idea.title}</CardTitle>
                    <Badge variant={idea.viralityScore > 85 ? 'default' : 'secondary'} className="flex-shrink-0">
                        <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                        {idea.viralityScore} / 100
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                 <p className="text-sm text-muted-foreground">{idea.description}</p>
                 <p className="text-sm"><strong className="text-foreground">Reasoning:</strong> {idea.reasoning}</p>
                 <div>
                    <h4 className="font-semibold text-sm mb-2">Keywords</h4>
                    <div className="flex flex-wrap gap-2">
                        {idea.keywords.map(keyword => (
                            <Badge key={keyword} variant="outline">{keyword}</Badge>
                        ))}
                    </div>
                 </div>
            </CardContent>
        </Card>
    );
}

export function TopicResearcher() {
  const [state, formAction] = useFormState(researchVideoTopicAction, initialState);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [ideas, setIdeas] = useState<ResearchVideoTopicOutput['ideas']>([]);

  useEffect(() => {
    if (state.message === 'success' && state.ideas) {
      setIdeas(state.ideas);
    } else if (state.message && state.message !== 'success' && state.message !== 'Validation failed') {
      toast({
        variant: "destructive",
        title: "Error Researching Topic",
        description: state.message,
      });
    }
  }, [state, toast]);

  const handleAction = (formData: FormData) => {
    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <div className="space-y-8">
      <form action={handleAction} className="flex flex-col sm:flex-row gap-2">
        <Input 
          name="topic" 
          placeholder="e.g., home gardening, retro video games, productivity hacks" 
          required 
          className="flex-1"
        />
        <SubmitButton pending={isPending} />
      </form>
      {state.errors?.topic && <p className="text-sm text-destructive -mt-6">{state.errors.topic[0]}</p>}
      
      <div className="relative">
        <Separator />
        <div className="absolute inset-0 flex items-center justify-center">
            <span className="bg-card px-4 text-muted-foreground font-semibold">AI-Generated Ideas</span>
        </div>
      </div>

      <div className="space-y-6">
        {isPending ? (
            Array(3).fill(0).map((_, i) => (
                <Card key={i}>
                    <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <div className="flex flex-wrap gap-2">
                           <Skeleton className="h-6 w-20" />
                           <Skeleton className="h-6 w-24" />
                           <Skeleton className="h-6 w-16" />
                        </div>
                    </CardContent>
                </Card>
            ))
        ) : ideas.length > 0 ? (
            ideas.map((idea, index) => <IdeaCard key={idea.title} idea={idea} index={index} />)
        ) : (
            <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-md">
                <Lightbulb className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-semibold">Video Ideas Will Appear Here</h3>
                <p>Enter a topic above to get started.</p>
            </div>
        )}
      </div>
    </div>
  );
}

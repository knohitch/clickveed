
'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { useFormState } from 'react-dom';
import { useSearchParams, useRouter } from 'next/navigation';
import { creativeAssistantChatAction } from '@/lib/actions';
import type { Message } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, Sparkles, ArrowLeft, Lightbulb, PenSquare, FileText, MessageCircle } from 'lucide-react';
import { ChatMessage } from '@/components/chat-message';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const initialState = {
    stream: null,
    message: '',
    errors: {}
}

const starterPrompts: Record<string, string> = {
    brainstorm: "Of course! I can help you brainstorm video ideas. What topic are you thinking of?",
    write_script: "I'd be happy to write a script for you. What is the product or topic, and what's the general idea?",
    suggest_titles: "Excellent! I can suggest some catchy titles. What is your video about?",
    review_script: "I can definitely review a script for you. Please paste the script below, and let me know if you have any specific concerns.",
};

const starterCards = [
    {
      key: 'brainstorm',
      icon: Lightbulb,
      title: "Brainstorm ideas",
      userMessage: "I'd like to brainstorm some ideas.",
    },
    {
      key: 'write_script',
      icon: PenSquare,
      title: "Write a script",
      userMessage: "Can you help me write a script?",
    },
    {
      key: 'suggest_titles',
      icon: FileText,
      title: "Suggest titles",
      userMessage: "I need some title suggestions for my video.",
    },
    {
      key: 'review_script',
      icon: MessageCircle,
      title: "Review my script",
      userMessage: "Can you review a script for me?",
    },
];

function ChatSubmitButton({ disabled }: { disabled: boolean }) {
  return (
    <Button type="submit" size="icon" disabled={disabled} aria-label="Send message">
      {disabled ? <Sparkles className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
    </Button>
  );
}

export default function AiAssistantChatPage() {
  const [state, formAction] = useFormState(creativeAssistantChatAction, initialState);
  const [messages, setMessages] = useState<Message[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (hasInitialized) return;

    const starterKey = searchParams.get('starter');
    const directMessage = searchParams.get('prompt');
    let shouldInitialize = false;

    if (starterKey && starterPrompts[starterKey]) {
        const initialMessage: Message = {
            id: 'starter-message',
            role: 'model',
            content: starterPrompts[starterKey],
        };
        setMessages([initialMessage]);
        shouldInitialize = true;
    } else if (directMessage) {
        const userMessage: Message = { id: Date.now().toString(), role: 'user', content: directMessage };
        const formData = new FormData();
        formData.append('message', directMessage);
        
        startTransition(() => {
            setMessages(prev => [...prev, userMessage, { id: 'thinking', role: 'model', content: '' }]);
            formAction(formData);
        });

        shouldInitialize = true;
    }
    
    if (shouldInitialize) {
        setHasInitialized(true);
        router.replace('/dashboard/ai-assistant/chat', { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, hasInitialized]);

  async function handleFormSubmit(formData: FormData) {
    const userInput = formData.get('message') as string;
    if (!userInput.trim()) return;

    const history = [...messages];
    const optimisticMessage: Message = { id: Date.now().toString(), role: 'user', content: userInput };
    
    startTransition(() => {
        setMessages(prev => [...prev, optimisticMessage, { id: 'thinking', role: 'model', content: '' }]);
    });
    
    formRef.current?.reset();
    
    formData.append('history', JSON.stringify(history));

    formAction(formData);
  }

  const handleStarterClick = (starterKey: string, userMessage: string) => {
    const botReply = starterPrompts[starterKey];
    if (botReply) {
        const newUserMessage: Message = { id: `user-${Date.now()}`, role: 'user', content: userMessage };
        const newBotMessage: Message = { id: `model-${Date.now()}`, role: 'model', content: botReply };
        setMessages([newUserMessage, newBotMessage]);
    }
  }

  useEffect(() => {
    if (state.message) {
        toast({ variant: 'destructive', title: 'Error', description: state.message });
        setMessages(prev => prev.filter(m => m.id !== 'thinking'));
        return;
    }

    if (!state.stream) {
        return;
    }

    const stream = state.stream;
    let fullResponse = '';
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    const readStream = async () => {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            try {
                const { value, done } = await reader.read();
                if (done) break;
                
                fullResponse += decoder.decode(typeof value === 'string' ? new TextEncoder().encode(value) : value, { stream: true });

                setMessages(prev => {
                    const newMessages = [...prev];
                    const modelResponseIndex = newMessages.findIndex(m => m.id === 'thinking' || m.id === 'model-response');
                    if (modelResponseIndex !== -1) {
                        newMessages[modelResponseIndex] = { id: 'model-response', role: 'model', content: fullResponse };
                    }
                    return newMessages;
                });
            } catch (e) {
                console.error("Stream reading error:", e);
                toast({ variant: 'destructive', title: 'Stream Error', description: "Failed to read the response stream." });
                setMessages(prev => prev.filter(m => m.id !== 'thinking'));
                break;
            }
        }
    }
    readStream();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.stream, state.message, toast]);

  useEffect(() => {
    if (scrollAreaRef.current) {
        const scrollableView = scrollAreaRef.current.querySelector('div');
        if (scrollableView) {
           scrollableView.scrollTop = scrollableView.scrollHeight;
        }
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
        <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" size="icon" asChild>
                <Link href="/dashboard/ai-assistant">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
            <div>
                <h1 className="text-2xl font-bold font-headline">AI Creative Assistant</h1>
                <p className="text-muted-foreground text-sm">
                    Your creative partner for brainstorming, scripting, and more.
                </p>
            </div>
        </div>
        <Card className="h-full flex flex-col flex-1">
            <ScrollArea className="flex-1" ref={scrollAreaRef}>
                <CardContent className="p-4 md:p-6 space-y-6">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                        <Bot className="h-16 w-16 mb-4" />
                        <h2 className="text-2xl font-bold text-foreground">AI Creative Assistant</h2>
                        <p className="mt-2">How can I help you create something amazing today?</p>
                        <div className="grid grid-cols-2 gap-4 mt-8 w-full max-w-lg">
                            {starterCards.map((card) => (
                                <button key={card.key} onClick={() => handleStarterClick(card.key, card.userMessage)} className="p-4 border rounded-lg hover:bg-muted text-left transition-colors">
                                    <card.icon className="h-5 w-5 mb-2 text-primary"/>
                                    <p className="font-semibold text-sm text-foreground">{card.title}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    messages.map((m, i) => <ChatMessage key={m.id + i} message={m} />)
                )}
                </CardContent>
            </ScrollArea>
            <div className="p-4 border-t bg-background rounded-b-lg">
                <form
                ref={formRef}
                action={(formData) => handleFormSubmit(formData)}
                className="flex items-center gap-2"
                >
                <Input
                    name="message"
                    placeholder="Ask your creative assistant a question..."
                    autoComplete="off"
                    className="flex-1"
                    disabled={isPending}
                />
                <ChatSubmitButton disabled={isPending} />
                </form>
            </div>
        </Card>
    </div>
  );
}



'use client';

import { useState, useRef, useEffect } from 'react';
import { useFormState } from 'react-dom';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { MessageSquare, Send, Loader2, Sparkles } from 'lucide-react';
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAdminSettings } from '@/contexts/admin-settings-context';
import { supportChatAction } from '@/lib/actions';
import type { Message } from '@/lib/types';
import { ChatMessage } from './chat-message';
import { ScrollArea } from './ui/scroll-area';
import { createTicket } from '@/lib/support-actions';
import { Progress } from './ui/progress';

const initialState = {
    stream: null,
    responseText: '',
    message: '',
    errors: {}
}

export function SupportChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { isSupportOnline } = useAdminSettings();
  const { toast } = useToast();
  
  const [state, formAction] = useFormState(supportChatAction, initialState);
  const [messages, setMessages] = useState<Message[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const pendingMessageIdRef = useRef<string | null>(null);
  const [awaitingResponse, setAwaitingResponse] = useState(false);
  const [thinkingProgress, setThinkingProgress] = useState(0);

  const hasCreatedTicket = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      hasCreatedTicket.current = false;
      setMessages([]); 
      setAwaitingResponse(false);
      setThinkingProgress(0);
    } else {
        // Add initial bot message when chat opens
        setMessages([{
            id: 'initial-bot-message',
            role: 'model',
            content: isSupportOnline 
                ? "Hello! How can our support team help you today?" 
                : "Hello! Our human support team is currently unavailable, but I can help answer questions. Your conversation will be saved as a support ticket."
        }]);
    }
  }, [isOpen, isSupportOnline]);

  const handleFormSubmit = (formData: FormData) => {
    if (awaitingResponse) return;

    const userInput = formData.get('message') as string;
    if (!userInput.trim()) return;

    if (!hasCreatedTicket.current) {
        void createTicket({
            subject: `Chat: ${userInput.substring(0, 50)}...`,
            initialMessage: userInput,
        });
        hasCreatedTicket.current = true;
    }

    const history = messages
      .filter(m => !m.id.startsWith('pending-'))
      .map(msg => ({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.content
      }));
    const optimisticMessage: Message = { id: Date.now().toString(), role: 'user', content: userInput };
    const pendingId = `pending-${Date.now()}`;
    
    setMessages(prev => [...prev, optimisticMessage, { id: pendingId, role: 'model', content: '' }]);
    pendingMessageIdRef.current = pendingId;
    
    formRef.current?.reset();
    
    setAwaitingResponse(true);
    formData.append('history', JSON.stringify(history));
    formAction(formData);
  }

   useEffect(() => {
    if (state.message) {
        toast({ variant: 'destructive', title: 'Error', description: state.message });
        const pendingId = pendingMessageIdRef.current;
        if (pendingId) {
          setMessages(prev => prev.filter(m => m.id !== pendingId));
        }
        pendingMessageIdRef.current = null;
        setAwaitingResponse(false);
        setThinkingProgress(0);
        return;
    }

    if (!state.responseText) {
        return;
    }

    const pendingId = pendingMessageIdRef.current;
    setMessages(prev => {
        const newMessages = [...prev];
        const modelResponseIndex = pendingId ? newMessages.findIndex(m => m.id === pendingId) : -1;
        if (modelResponseIndex !== -1) {
            newMessages[modelResponseIndex] = { id: `model-${Date.now()}`, role: 'model', content: state.responseText };
        } else {
            newMessages.push({ id: `model-${Date.now()}`, role: 'model', content: state.responseText });
        }
        return newMessages;
    });
    pendingMessageIdRef.current = null;
    setAwaitingResponse(false);
    setThinkingProgress(100);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.responseText, state.message, toast]);

  useEffect(() => {
    if (!awaitingResponse) {
      const resetTimer = setTimeout(() => setThinkingProgress(0), 300);
      return () => clearTimeout(resetTimer);
    }

    setThinkingProgress(12);
    const timer = setInterval(() => {
      setThinkingProgress((current) => {
        if (current >= 90) return 90;
        return Math.min(90, current + 7);
      });
    }, 500);

    return () => clearInterval(timer);
  }, [awaitingResponse]);

  useEffect(() => {
    if (scrollAreaRef.current) {
        const scrollableView = scrollAreaRef.current.querySelector('div');
        if (scrollableView) {
           scrollableView.scrollTop = scrollableView.scrollHeight;
        }
    }
  }, [messages]);
  

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="fixed bottom-6 right-6 z-50 h-14 rounded-full shadow-lg px-4">
          <MessageSquare className="h-5 w-5" />
          <span className="ml-2 hidden sm:inline">Support</span>
           <span className={`absolute top-1 right-1 block h-3 w-3 rounded-full ${isSupportOnline ? 'bg-green-500' : 'bg-yellow-500'} ring-2 ring-background`} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md flex flex-col h-[70vh]">
        <DialogHeader>
          <DialogTitle>Contact Support</DialogTitle>
          <DialogDescription>
            {isSupportOnline ? 'Chat with our support team live.' : 'Chat with our AI assistant. A ticket will be created for our team.'}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 -mx-6 px-6" ref={scrollAreaRef}>
            <div className="pr-4 space-y-4">
                {messages.map((m, i) => <ChatMessage key={m.id + i} message={m} />)}
            </div>
        </ScrollArea>

        <form onSubmit={(e) => { e.preventDefault(); handleFormSubmit(new FormData(e.currentTarget)); }} ref={formRef} className="relative">
            {awaitingResponse && (
              <div className="mb-2 rounded-md border bg-muted/40 px-3 py-2 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Assistant is working on your response...
                </div>
                <Progress value={thinkingProgress} className="h-1.5" />
              </div>
            )}
            <Textarea
                name="message"
                placeholder="Type your message..."
                className="pr-12"
                rows={3}
                disabled={awaitingResponse}
                 onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleFormSubmit(new FormData(e.currentTarget.form!));
                    }
                }}
            />
            <Button type="submit" size="icon" className="absolute bottom-2 right-2 h-8 w-8" disabled={awaitingResponse}>
                {awaitingResponse ? <Sparkles className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

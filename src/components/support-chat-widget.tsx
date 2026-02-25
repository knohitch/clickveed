

'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { useFormState } from 'react-dom';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { MessageSquare, Send, Bot, Mail } from 'lucide-react';
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAdminSettings } from '@/contexts/admin-settings-context';
import { supportChatAction } from '@/lib/actions';
import type { Message } from '@/lib/types';
import { ChatMessage } from './chat-message';
import { ScrollArea } from './ui/scroll-area';
import { Sparkles } from 'lucide-react';
import { createTicket } from '@/lib/support-actions';
import type { User } from 'next-auth';

interface SupportChatWidgetProps {
  user: User;
}

const initialState = {
    stream: null,
    responseText: '',
    message: '',
    errors: {}
}

export function SupportChatWidget({ user }: SupportChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { isSupportOnline } = useAdminSettings();
  const { toast } = useToast();
  
  const [state, formAction] = useFormState(supportChatAction, initialState);
  const [messages, setMessages] = useState<Message[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();

  const hasCreatedTicket = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      hasCreatedTicket.current = false;
      setMessages([]); 
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
    const userInput = formData.get('message') as string;
    if (!userInput.trim()) return;

    if (!hasCreatedTicket.current) {
        createTicket({
            userName: user.name || 'User',
            userEmail: user.email || 'No email provided',
            userAvatar: '', // next-auth User type doesn't have avatarUrl
            subject: `Chat: ${userInput.substring(0, 50)}...`,
            initialMessage: userInput,
        });
        hasCreatedTicket.current = true;
    }

    const history = [...messages];
    const optimisticMessage: Message = { id: Date.now().toString(), role: 'user', content: userInput };
    
    startTransition(() => {
        setMessages(prev => [...prev, optimisticMessage, { id: 'thinking', role: 'model', content: '' }]);
    });
    
    formRef.current?.reset();
    
    formData.append('history', JSON.stringify(history));
    formAction(formData);
  }

   useEffect(() => {
    if (state.message) {
        toast({ variant: 'destructive', title: 'Error', description: state.message });
        setMessages(prev => prev.filter(m => m.id !== 'thinking'));
        return;
    }

    if (!state.responseText) {
        return;
    }

    setMessages(prev => {
        const newMessages = [...prev];
        const modelResponseIndex = newMessages.findIndex(m => m.id === 'thinking' || m.id === 'model-response');
        if (modelResponseIndex !== -1) {
            newMessages[modelResponseIndex] = { id: 'model-response', role: 'model', content: state.responseText };
        } else {
            newMessages.push({ id: 'model-response', role: 'model', content: state.responseText });
        }
        return newMessages;
    });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.responseText, state.message, toast]);

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
        <Button className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg" size="icon">
          <MessageSquare className="h-8 w-8" />
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
            <Textarea
                name="message"
                placeholder="Type your message..."
                className="pr-12"
                rows={3}
                disabled={isPending}
                 onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleFormSubmit(new FormData(e.currentTarget.form!));
                    }
                }}
            />
            <Button type="submit" size="icon" className="absolute bottom-2 right-2 h-8 w-8" disabled={isPending}>
                {isPending ? <Sparkles className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

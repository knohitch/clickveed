'use client';

import { useState, useRef, useEffect, useTransition, useMemo } from 'react';
import { useFormState } from 'react-dom';
import { useSearchParams, useRouter } from 'next/navigation';
import { creativeAssistantChatAction } from '@/lib/actions';
import type { Message } from '@/lib/types';
import {
  createAiAssistantConversation,
  getAiAssistantConversations,
  importAiAssistantConversations,
  saveAiAssistantConversation,
  type AiAssistantConversation,
} from '@/lib/ai-assistant-conversations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, Sparkles, ArrowLeft, Lightbulb, PenSquare, FileText, MessageCircle, Plus } from 'lucide-react';
import { ChatMessage } from '@/components/chat-message';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'ai_assistant_conversations_v1';
const STORAGE_MIGRATION_KEY = 'ai_assistant_conversations_migrated_v1';

const initialState = {
  stream: null,
  responseText: '',
  message: '',
  errors: {}
};

type Conversation = {
  id: string;
  title: string;
  updatedAt: number;
  messages: Message[];
};

type LegacyConversation = {
  id?: string;
  title?: string;
  updatedAt?: number;
  messages?: Message[];
};

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

function toConversation(record: AiAssistantConversation): Conversation {
  return {
    id: record.id,
    title: record.title,
    updatedAt: record.updatedAt,
    messages: record.messages,
  };
}

function normalizeRole(role: unknown): 'user' | 'model' {
  if (role === 'user') return 'user';
  if (role === 'assistant') return 'model';
  return 'model';
}

function parseLocalConversations(raw: string): LegacyConversation[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item) => {
      const candidate = item as Partial<LegacyConversation>;
      const messages = Array.isArray(candidate.messages)
        ? candidate.messages
            .map((message, index) => {
              const msgCandidate = message as Partial<Message>;
              if (typeof msgCandidate?.content !== 'string') return null;
              if (!msgCandidate.content.trim()) return null;
              return {
                id:
                  typeof msgCandidate.id === 'string' && msgCandidate.id.trim()
                    ? msgCandidate.id
                    : `legacy-${Date.now()}-${index}`,
                role: normalizeRole(msgCandidate.role),
                content: msgCandidate.content,
              } satisfies Message;
            })
            .filter((message): message is Message => !!message)
        : [];

      return {
        id: typeof candidate.id === 'string' ? candidate.id : undefined,
        title: typeof candidate.title === 'string' ? candidate.title : 'New chat',
        updatedAt: typeof candidate.updatedAt === 'number' ? candidate.updatedAt : Date.now(),
        messages,
      } satisfies LegacyConversation;
    });
  } catch {
    return [];
  }
}

function sortConversations(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
}

function ChatSubmitButton({ disabled }: { disabled: boolean }) {
  return (
    <Button type="submit" size="icon" disabled={disabled} aria-label="Send message">
      {disabled ? <Sparkles className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
    </Button>
  );
}

export default function AiAssistantChatPage() {
  const [state, formAction] = useFormState(creativeAssistantChatAction, initialState);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [hasInitialized, setHasInitialized] = useState(false);
  const pendingMessageIdRef = useRef<string | null>(null);
  const pendingConversationIdRef = useRef<string | null>(null);
  const pendingInitialMessageRef = useRef<string | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);
  const activeConversationIdRef = useRef<string | null>(null);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) || null,
    [conversations, activeConversationId]
  );
  const messages = activeConversation?.messages || [];

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    let isCancelled = false;

    const loadHistory = async () => {
      try {
        const dbConversations = await getAiAssistantConversations();
        if (isCancelled) return;

        if (dbConversations.length > 0) {
          const normalized = sortConversations(dbConversations.map(toConversation));
          setConversations(normalized);
          setActiveConversationId(normalized[0]?.id || null);
          localStorage.setItem(STORAGE_MIGRATION_KEY, '1');
          return;
        }

        if (localStorage.getItem(STORAGE_MIGRATION_KEY) === '1') {
          return;
        }

        const localRaw = localStorage.getItem(STORAGE_KEY);
        if (!localRaw) return;

        const localConversations = parseLocalConversations(localRaw);
        if (localConversations.length === 0) return;

        localStorage.setItem(STORAGE_MIGRATION_KEY, '1');
        localStorage.removeItem(STORAGE_KEY);

        let imported: AiAssistantConversation[] = [];
        try {
          imported = await importAiAssistantConversations({ conversations: localConversations });
        } catch (importError) {
          localStorage.setItem(STORAGE_KEY, localRaw);
          localStorage.removeItem(STORAGE_MIGRATION_KEY);
          throw importError;
        }
        if (isCancelled) return;

        const normalized = sortConversations(imported.map(toConversation));
        setConversations(normalized);
        setActiveConversationId(normalized[0]?.id || null);
      } catch (error) {
        console.warn('Failed to load AI assistant history from DB', error);
      }
    };

    void loadHistory();

    return () => {
      isCancelled = true;
    };
  }, []);

  const persistConversation = (conversation: Conversation) => {
    void saveAiAssistantConversation({
      id: conversation.id,
      title: conversation.title,
      messages: conversation.messages,
    }).catch((error) => {
      console.warn('Failed to persist AI assistant conversation', error);
    });
  };

  const updateConversationMessages = (
    conversationId: string,
    updater: (current: Message[]) => Message[],
    titleHint?: string,
    shouldPersist = true
  ) => {
    let updatedConversation: Conversation | null = null;
    setConversations((prev) => {
      const next = prev
        .map((conv) => {
          if (conv.id !== conversationId) return conv;
          const updatedMessages = updater(conv.messages);
          const newTitle =
            conv.title === 'New chat' && titleHint
              ? titleHint.slice(0, 120)
              : conv.title;
          updatedConversation = {
            ...conv,
            title: newTitle,
            updatedAt: Date.now(),
            messages: updatedMessages,
          };
          return updatedConversation;
        })
      return sortConversations(next);
    });

    if (updatedConversation && shouldPersist) {
      persistConversation(updatedConversation);
    }
  };

  const startNewChat = async () => {
    try {
      const created = await createAiAssistantConversation({ title: 'New chat', messages: [] });
      const nextConversation = toConversation(created);
      setConversations((prev) => sortConversations([nextConversation, ...prev.filter((conv) => conv.id !== nextConversation.id)]));
      setActiveConversationId(nextConversation.id);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not start a chat',
        description: error instanceof Error ? error.message : 'Try again.',
      });
    }
  };

  const ensureActiveConversation = async (seedTitle?: string): Promise<Conversation | null> => {
    const currentId = activeConversationIdRef.current;
    if (currentId) {
      const existing = conversationsRef.current.find((conv) => conv.id === currentId);
      if (existing) return existing;
    }

    try {
      const created = await createAiAssistantConversation({ title: seedTitle || 'New chat', messages: [] });
      const nextConversation = toConversation(created);
      setConversations((prev) => sortConversations([nextConversation, ...prev.filter((conv) => conv.id !== nextConversation.id)]));
      setActiveConversationId(nextConversation.id);
      return nextConversation;
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not start a chat',
        description: error instanceof Error ? error.message : 'Try again.',
      });
      return null;
    }
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const targetConversation = await ensureActiveConversation(trimmed);
    if (!targetConversation) return;

    const targetConversationId = targetConversation.id;
    const latestConversation =
      conversationsRef.current.find((conversation) => conversation.id === targetConversationId) || targetConversation;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };
    const pendingId = `pending-${Date.now()}`;
    const pendingMessage: Message = { id: pendingId, role: 'model', content: '' };

    const requestHistory = latestConversation.messages
      .filter((m) => !m.id.startsWith('pending-'))
      .map((msg) => ({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.content,
      }));

    updateConversationMessages(targetConversationId, (current) => [...current, userMessage, pendingMessage], trimmed);
    pendingMessageIdRef.current = pendingId;
    pendingConversationIdRef.current = targetConversationId;

    const formData = new FormData();
    formData.append('message', trimmed);
    formData.append('history', JSON.stringify(requestHistory));

    startTransition(() => {
      formAction(formData);
    });
  };

  useEffect(() => {
    if (hasInitialized) return;

    const starterKey = searchParams.get('starter');
    const directMessage = searchParams.get('prompt');

    const bootstrapQueryConversation = async () => {
      if (starterKey && starterPrompts[starterKey]) {
        const created = await createAiAssistantConversation({
          title: starterCards.find((s) => s.key === starterKey)?.title || 'New chat',
          messages: [{ id: `starter-${Date.now()}`, role: 'model', content: starterPrompts[starterKey] }],
        });
        const conversation = toConversation(created);
        setConversations((prev) => sortConversations([conversation, ...prev.filter((item) => item.id !== conversation.id)]));
        setActiveConversationId(conversation.id);
        router.replace('/dashboard/ai-assistant/chat', { scroll: false });
        return;
      }

      if (directMessage) {
        const created = await createAiAssistantConversation({ title: directMessage, messages: [] });
        const conversation = toConversation(created);
        setConversations((prev) => sortConversations([conversation, ...prev.filter((item) => item.id !== conversation.id)]));
        setActiveConversationId(conversation.id);
        pendingInitialMessageRef.current = directMessage;
        router.replace('/dashboard/ai-assistant/chat', { scroll: false });
        return;
      }
    };

    void bootstrapQueryConversation()
      .catch((error) => {
        console.warn('Failed to initialize query-based conversation', error);
      })
      .finally(() => {
        setHasInitialized(true);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, hasInitialized]);

  const handleStarterClick = async (starterKey: string, userMessage: string) => {
    const botReply = starterPrompts[starterKey];
    try {
      const created = await createAiAssistantConversation({
        title: userMessage,
        messages: [
          { id: `user-${Date.now()}`, role: 'user', content: userMessage },
          { id: `model-${Date.now()}`, role: 'model', content: botReply || 'How can I help you?' },
        ],
      });
      const conversation = toConversation(created);
      setConversations((prev) => sortConversations([conversation, ...prev.filter((item) => item.id !== conversation.id)]));
      setActiveConversationId(conversation.id);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not create starter chat',
        description: error instanceof Error ? error.message : 'Try again.',
      });
    }
  };

  const handleFormSubmit = (formData: FormData) => {
    const userInput = (formData.get('message') as string) || '';
    formRef.current?.reset();
    void sendMessage(userInput);
  };

  useEffect(() => {
    if (!activeConversationId || !pendingInitialMessageRef.current) return;
    const initialText = pendingInitialMessageRef.current;
    pendingInitialMessageRef.current = null;
    void sendMessage(initialText);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId]);

  useEffect(() => {
    if (state.message) {
      toast({ variant: 'destructive', title: 'Error', description: state.message });
      const pendingId = pendingMessageIdRef.current;
      const pendingConversationId = pendingConversationIdRef.current;
      if (pendingId && pendingConversationId) {
        updateConversationMessages(pendingConversationId, (current) => current.filter((m) => m.id !== pendingId));
      }
      pendingMessageIdRef.current = null;
      pendingConversationIdRef.current = null;
      return;
    }

    if (!state.responseText) return;

    const pendingId = pendingMessageIdRef.current;
    const pendingConversationId = pendingConversationIdRef.current;
    if (!pendingConversationId) return;

    updateConversationMessages(pendingConversationId, (current) => {
      const next = [...current];
      const targetIndex = pendingId ? next.findIndex((m) => m.id === pendingId) : -1;
      const modelMessage: Message = {
        id: `model-${Date.now()}`,
        role: 'model',
        content: state.responseText,
      };
      if (targetIndex !== -1) {
        next[targetIndex] = modelMessage;
      } else {
        next.push(modelMessage);
      }
      return next;
    });
    pendingMessageIdRef.current = null;
    pendingConversationIdRef.current = null;
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0">
        <Card className="lg:col-span-3 h-full min-h-0">
          <CardContent className="p-3 h-full flex flex-col min-h-0">
            <Button onClick={startNewChat} className="w-full mb-3">
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-2 pr-2">
                {conversations.length === 0 && (
                  <p className="text-sm text-muted-foreground px-2 py-1">No previous chats yet.</p>
                )}
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md border text-sm",
                      activeConversationId === conv.id ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
                    )}
                  >
                    <p className="font-medium truncate">{conv.title}</p>
                    <p className="text-xs opacity-80">{new Date(conv.updatedAt).toLocaleString()}</p>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-9 h-full flex flex-col min-h-0">
          <ScrollArea className="flex-1 min-h-0" ref={scrollAreaRef}>
            <CardContent className="p-4 md:p-6 space-y-6">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                  <Bot className="h-16 w-16 mb-4" />
                  <h2 className="text-2xl font-bold text-foreground">AI Creative Assistant</h2>
                  <p className="mt-2">How can I help you create something amazing today?</p>
                  <div className="grid grid-cols-2 gap-4 mt-8 w-full max-w-lg">
                    {starterCards.map((card) => (
                      <button key={card.key} onClick={() => handleStarterClick(card.key, card.userMessage)} className="p-4 border rounded-lg hover:bg-muted text-left transition-colors">
                        <card.icon className="h-5 w-5 mb-2 text-primary" />
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
    </div>
  );
}

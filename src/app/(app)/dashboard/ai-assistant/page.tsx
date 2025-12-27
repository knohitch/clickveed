
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { ArrowRight, Lightbulb, MessageCircle, Send, Target } from 'lucide-react';
import Link from 'next/link';
import { Input } from '../../../../components/ui/input';
import { useRouter } from 'next/navigation';

const assistantTools = [
  {
    title: "Creative Assistant Chat",
    description: "Your creative partner for brainstorming, scripting, and more.",
    icon: MessageCircle,
    href: "/dashboard/ai-assistant/chat",
    cta: "Start Chatting",
  },
  {
    title: "AI Topic Researcher",
    description: "Discover trending topics and keywords for your next video.",
    icon: Lightbulb,
    href: "/dashboard/ai-assistant/topic-researcher",
    cta: "Research Topics",
  },
  {
    title: "AI Thumbnail Tester",
    description: "A/B test your thumbnails with AI-powered feedback and scores.",
    icon: Target,
    href: "/dashboard/ai-assistant/thumbnail-tester",
    cta: "Test Thumbnails",
  }
];


export default function AiAssistantPage() {
  const router = useRouter();

  const handleChatSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const prompt = formData.get('prompt') as string;
    if (prompt.trim()) {
      router.push(`/dashboard/ai-assistant/chat?prompt=${encodeURIComponent(prompt)}`);
    }
  };


  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assistantTools.map((tool) => (
                <Card key={tool.title} className="flex flex-col">
                    <CardHeader className="flex-row items-center gap-4 space-y-0 pb-4">
                        <div className="p-3 bg-muted rounded-full">
                           <tool.icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle>{tool.title}</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <CardDescription>{tool.description}</CardDescription>
                    </CardContent>
                    <CardFooter>
                        <Button asChild className="w-full">
                            <Link href={tool.href}>
                                {tool.cta} <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Start a New Chat</CardTitle>
                <CardDescription>Have something specific in mind? Start a conversation right here.</CardDescription>
            </CardHeader>
            <CardContent>
                 <form onSubmit={handleChatSubmit} className="flex items-center gap-2">
                    <Input
                        name="prompt"
                        placeholder="Ask me anything about video creation..."
                        className="flex-1"
                        autoComplete="off"
                    />
                    <Button type="submit" size="icon" aria-label="Send message">
                        <Send className="h-5 w-5" />
                    </Button>
                </form>
            </CardContent>
        </Card>
    </div>
  );
}

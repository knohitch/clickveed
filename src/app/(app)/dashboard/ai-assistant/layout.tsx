
'use client';

import { Tabs, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function AiAssistantLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    const getActiveTool = () => {
        if (pathname.includes('/chat')) return 'chat';
        if (pathname.includes('/topic-researcher')) return 'topic-researcher';
        if (pathname.includes('/thumbnail-tester')) return 'thumbnail-tester';
        return 'home'; // Fallback to a value that exists in the list
    }

    const handleValueChange = (value: string) => {
        const path = value === 'home' ? '/dashboard/ai-assistant' : `/dashboard/ai-assistant/${value}`;
        router.push(path);
    };
    
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold font-headline">AI Assistant</h1>
                <p className="text-muted-foreground">
                    Your suite of AI-powered tools for brainstorming and content strategy.
                </p>
            </div>
            <Tabs value={getActiveTool()} onValueChange={handleValueChange} className="w-full">
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
                     <TabsTrigger value="home" asChild>
                       <Link href="/dashboard/ai-assistant">Assistant Home</Link>
                    </TabsTrigger>
                    <TabsTrigger value="topic-researcher" asChild>
                        <Link href="/dashboard/ai-assistant/topic-researcher">Topic Researcher</Link>
                    </TabsTrigger>
                    <TabsTrigger value="thumbnail-tester" asChild>
                        <Link href="/dashboard/ai-assistant/thumbnail-tester">Thumbnail Tester</Link>
                    </TabsTrigger>
                </TabsList>
                <div className="mt-4">
                     {children}
                </div>
            </Tabs>
        </div>
    );
}

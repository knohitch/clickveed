
'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function AiAgentsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    const getActiveTool = () => {
        if (pathname.includes('/integrations')) return 'integrations';
        return 'builder';
    }

    const handleValueChange = (value: string) => {
        const path = value === 'builder' ? '/dashboard/ai-agents' : `/dashboard/ai-agents/${value}`;
        router.push(path);
    };
    
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold font-headline">AI Agents</h1>
                <p className="text-muted-foreground">
                    Build and manage automated workflows powered by AI.
                </p>
            </div>
            <Tabs value={getActiveTool()} onValueChange={handleValueChange} className="w-full">
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2">
                    <TabsTrigger value="builder" asChild>
                       <Link href="/dashboard/ai-agents">AI Agent Builder</Link>
                    </TabsTrigger>
                    <TabsTrigger value="integrations" asChild>
                        <Link href="/dashboard/ai-agents/integrations">Integrations</Link>
                    </TabsTrigger>
                </TabsList>
                <div className="mt-4">
                     {children}
                </div>
            </Tabs>
        </div>
    );
}

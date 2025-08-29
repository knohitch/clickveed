
'use client';

import { Tabs, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function SocialSuiteLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    const getActiveTool = () => {
        if (pathname.includes('/analytics')) return 'analytics';
        if (pathname.includes('/integrations')) return 'integrations';
        if (pathname.includes('/scheduler')) return 'scheduler';
        return 'analytics';
    }

    const handleValueChange = (value: string) => {
        router.push(`/dashboard/social-suite/${value}`);
    };
    
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold font-headline">Social Suite</h1>
                <p className="text-muted-foreground">
                    Connect your accounts, schedule posts, and track performance.
                </p>
            </div>
            <Tabs value={getActiveTool()} onValueChange={handleValueChange} className="w-full">
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
                    <TabsTrigger value="analytics" asChild>
                       <Link href="/dashboard/social-suite/analytics">Analytics</Link>
                    </TabsTrigger>
                    <TabsTrigger value="scheduler" asChild>
                        <Link href="/dashboard/social-suite/scheduler">Scheduler</Link>
                    </TabsTrigger>
                    <TabsTrigger value="integrations" asChild>
                        <Link href="/dashboard/social-suite/integrations">Integrations</Link>
                    </TabsTrigger>
                </TabsList>
                <div className="mt-4">
                     {children}
                </div>
            </Tabs>
        </div>
    );
}



'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';


export default function VideoSuiteLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    const isRoot = pathname === '/dashboard/video-suite';

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold font-headline">Video Suite</h1>
                <p className="text-muted-foreground">
                    A collection of powerful tools to create and enhance your videos.
                </p>
            </div>

            {!isRoot && (
                 <div className="flex justify-between items-center">
                    <Button variant="outline" asChild className="w-fit">
                        <Link href="/dashboard/video-suite">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to All Video Tools
                        </Link>
                    </Button>
                </div>
            )}
            
            <div className="mt-4">
                     {children}
            </div>
        </div>
    );
}

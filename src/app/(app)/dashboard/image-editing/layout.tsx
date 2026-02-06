
'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function ImageEditingLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    const getActiveTool = () => {
        if (pathname.includes('/ai-image-generator')) return 'ai-image-generator';
        if (pathname.includes('/flux-pro')) return 'flux-pro';
        if (pathname.includes('/background-remover')) return 'background-remover';
        return 'ai-image-generator';
    }

    const handleValueChange = (value: string) => {
        router.push(`/dashboard/image-editing/${value}`);
    };
    
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold font-headline">Image Editing Suite</h1>
                <p className="text-muted-foreground">
                    Create and enhance your images with powerful AI tools.
                </p>
            </div>
            <Tabs value={getActiveTool()} onValueChange={handleValueChange} className="w-full">
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
                    <TabsTrigger value="ai-image-generator" asChild>
                       <Link href="/dashboard/image-editing/ai-image-generator">AI Image Generator</Link>
                    </TabsTrigger>
                    <TabsTrigger value="flux-pro" asChild>
                        <Link href="/dashboard/image-editing/flux-pro">Flux Pro Editor</Link>
                    </TabsTrigger>
                    <TabsTrigger value="background-remover" asChild>
                        <Link href="/dashboard/image-editing/background-remover">Background Remover</Link>
                    </TabsTrigger>
                </TabsList>
                <div className="mt-4">
                     {children}
                </div>
            </Tabs>
        </div>
    );
}

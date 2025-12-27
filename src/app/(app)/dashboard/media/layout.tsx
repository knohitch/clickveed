
'use client';

import { ReactNode } from 'react';

export default function MediaLayout({ children }: { children: ReactNode }) {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold font-headline">Media Library</h1>
                <p className="text-muted-foreground">
                    Organize, manage, and securely share all your media assets.
                </p>
            </div>
            {children}
        </div>
    );
}


'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, KeyRound, Palette, CreditCard, ShieldQuestion, HelpCircle } from 'lucide-react';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const getActiveTab = () => {
        if (pathname.includes('/brand-kit')) return 'brand-kit';
        if (pathname.includes('/support')) return 'support';
        if (pathname.includes('/billing')) return 'billing';
        if (pathname.includes('/account')) return 'account';
        return 'profile';
    };

    const activeTab = getActiveTab();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold font-headline">Settings</h1>
                <p className="text-muted-foreground">
                    Manage your account, preferences, and brand configurations.
                </p>
            </div>
            <Tabs defaultValue={activeTab} className="w-full" value={activeTab}>
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                    <TabsTrigger value="profile" asChild>
                       <Link href="/dashboard/settings"><User className="mr-2 h-4 w-4" /> Profile</Link>
                    </TabsTrigger>
                     <TabsTrigger value="billing" asChild>
                        <Link href="/dashboard/settings/billing"><CreditCard className="mr-2 h-4 w-4" /> Billing</Link>
                    </TabsTrigger>
                     <TabsTrigger value="brand-kit" asChild>
                        <Link href="/dashboard/settings/brand-kit"><Palette className="mr-2 h-4 w-4" /> Brand Kit</Link>
                    </TabsTrigger>
                      <TabsTrigger value="account" asChild>
                        <Link href="/dashboard/settings/account"><ShieldQuestion className="mr-2 h-4 w-4" /> Account</Link>
                    </TabsTrigger>
                </TabsList>
                <div className="mt-4">
                     {children}
                </div>
            </Tabs>
        </div>
    );
}

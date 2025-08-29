
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, BarChart3, Settings, ShieldCheck, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { SupportStatusSwitch } from '@/components/admin/support-status-switch';

export const dynamic = 'force-dynamic';

const overviewCards = [
    {
        title: "Users",
        value: "1,250",
        change: "+150 this month",
        icon: Users,
        href: "/chin/dashboard/users"
    },
    {
        title: "Revenue",
        value: "$12,450",
        change: "+$2,100 this month",
        icon: BarChart3,
        href: "/chin/dashboard/analytics"
    },
    {
        title: "Active Subscriptions",
        value: "850",
        change: "+50 this month",
        icon: ShieldCheck,
        href: "/chin/dashboard/subscriptions"
    },
    {
        title: "API Status",
        value: "All Systems Go",
        change: "No issues detected",
        icon: Settings,
        href: "/chin/dashboard/api-integrations"
    }
];


export default function SuperAdminDashboardPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Super Admin Dashboard</h1>
                <p className="text-muted-foreground">
                    Welcome to the main control panel for the entire platform.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {overviewCards.map((card) => (
                    <Card key={card.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-base font-medium">{card.title}</CardTitle>
                            <card.icon className="h-5 w-5 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{card.value}</div>
                            <p className="text-sm text-muted-foreground">{card.change}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
            <div className="grid gap-8 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>Jump directly to key management areas.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <Button asChild variant="outline"><Link href="/chin/dashboard/users">Manage Users</Link></Button>
                        <Button asChild variant="outline"><Link href="/chin/dashboard/plans">Manage Plans</Link></Button>
                        <Button asChild variant="outline"><Link href="/chin/dashboard/support">View Support Tickets</Link></Button>
                        <Button asChild variant="outline"><Link href="/chin/dashboard/settings">Platform Settings</Link></Button>
                    </CardContent>
                </Card>
                <SupportStatusSwitch />
            </div>
        </div>
    );
}

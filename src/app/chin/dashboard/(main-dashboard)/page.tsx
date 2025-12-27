
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, BarChart3, Settings, ShieldCheck, ArrowUpRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { SupportStatusSwitch } from '@/components/admin/support-status-switch';
import { getDashboardStats } from '@/lib/admin-actions';

export const dynamic = 'force-dynamic';

// Loading component for dashboard stats
function DashboardStatsLoading() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Super Admin Dashboard</h1>
                <p className="text-muted-foreground">
                    Loading dashboard data...
                </p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="h-5 w-24 bg-muted rounded"></div>
                            <div className="h-5 w-5 bg-muted rounded-full"></div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-8 w-16 bg-muted rounded mb-2"></div>
                            <div className="h-4 w-32 bg-muted rounded"></div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        </div>
    );
}

// Define the stats type
type DashboardStats = {
    totalUsers: { value: string; change: string };
    revenue: { value: string; change: string };
    activeSubscriptions: { value: string; change: string };
    apiStatus: { value: string; change: string };
}

// Dashboard stats component with data
async function DashboardStats() {
    // Fetch real data from the database
    const stats = await getDashboardStats() as DashboardStats;
    
    const overviewCards = [
        {
            title: "Users",
            value: stats.totalUsers.value,
            change: stats.totalUsers.change,
            icon: Users,
            href: "/chin/dashboard/users"
        },
        {
            title: "Revenue",
            value: stats.revenue.value,
            change: stats.revenue.change,
            icon: BarChart3,
            href: "/chin/dashboard/analytics"
        },
        {
            title: "Active Subscriptions",
            value: stats.activeSubscriptions.value,
            change: stats.activeSubscriptions.change,
            icon: ShieldCheck,
            href: "/chin/dashboard/subscriptions"
        },
        {
            title: "API Status",
            value: stats.apiStatus.value,
            change: stats.apiStatus.change,
            icon: Settings,
            href: "/chin/dashboard/api-integrations"
        }
    ];

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

// Main dashboard page component using Suspense
export default function SuperAdminDashboardPage() {
    return (
        <Suspense fallback={<DashboardStatsLoading />}>
            <DashboardStats />
        </Suspense>
    );
}

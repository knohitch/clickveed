
import { AnalyticsClient, type AnalyticsData } from "@/components/admin/analytics-client";
import prisma from "@/server/prisma";

export const dynamic = 'force-dynamic';

async function getAnalyticsData(): Promise<AnalyticsData> {
    const allUsers = await prisma.user.findMany({ include: { plan: true } });
    const allPlans = await prisma.plan.findMany();

    const totalUsers = allUsers.length;
    const activeSubs = allUsers.filter(u => u.plan && u.plan.priceMonthly > 0).length;
    
    const mrr = allUsers
        .filter(u => u.plan && u.plan.priceMonthly > 0)
        .reduce((acc, user) => acc + (user.plan?.priceMonthly || 0), 0);
        
    const planDistributionMap = new Map<string, number>();
    allPlans.forEach(plan => planDistributionMap.set(plan.name, 0));
    allUsers.forEach(user => {
        if(user.plan) {
            planDistributionMap.set(user.plan.name, (planDistributionMap.get(user.plan.name) || 0) + 1);
        }
    });
    
    const planDistributionData = Array.from(planDistributionMap.entries()).map(([name, value], index) => ({
        name,
        value,
        fill: `hsl(var(--chart-${(index % 5) + 1}))`
    }));

    const recentSignups = await prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { displayName: true, email: true, createdAt: true, avatarUrl: true }
    });

    return {
        userGrowthData: [],
        revenueData: [],
        contentGenerationData: [ 
            { name: "Videos", total: 123 },
            { name: "Scripts", total: 456 },
            { name: "Voiceovers", total: 789 },
        ],
        recentSignups: recentSignups.map(u => ({
            displayName: u.displayName || 'Unnamed User',
            email: u.email || 'No email',
            time: u.createdAt.toLocaleDateString(),
            avatarUrl: u.avatarUrl || ''
        })),
        planDistributionData,
        summary: {
            totalUsers: { value: totalUsers.toLocaleString(), change: '+20.1% from last month' },
            mrr: { value: `$${mrr.toLocaleString()}`, change: '+12.2% from last month' },
            churn: { value: '1.2%', change: '+0.2% from last month' },
            activeSubs: { value: activeSubs.toLocaleString(), change: '+50 this month' },
        }
    };
}


export default async function AdminAnalyticsPage() {
    const data = await getAnalyticsData();

    return <AnalyticsClient initialData={data} />;
}

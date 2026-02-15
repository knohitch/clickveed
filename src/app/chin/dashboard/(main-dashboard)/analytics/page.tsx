
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

    // Generate user growth data for the last 30 days
    const userGrowthData = [];
    const revenueData = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        // Count users created on or before this date
        const usersUpToDate = allUsers.filter(user => 
            new Date(user.createdAt) <= date
        ).length;
        
        // Calculate MRR up to this date
        const mrrUpToDate = allUsers
            .filter(user => 
                new Date(user.createdAt) <= date && user.plan && user.plan.priceMonthly > 0
            )
            .reduce((acc, user) => acc + (user.plan?.priceMonthly || 0), 0);
        
        userGrowthData.push({
            date: dateStr,
            users: usersUpToDate
        });
        
        revenueData.push({
            date: dateStr,
            mrr: mrrUpToDate
        });
    }

    // Get actual content generation data
    const allMediaAssets = await prisma.mediaAsset.findMany();
    const videoCount = allMediaAssets.filter(m => m.type === 'VIDEO').length;
    const scriptCount = allMediaAssets.filter(m => m.type === 'SCRIPT').length;
    const audioCount = allMediaAssets.filter(m => m.type === 'AUDIO').length;

    return {
        userGrowthData,
        revenueData,
        contentGenerationData: [ 
            { name: "Videos", total: videoCount },
            { name: "Scripts", total: scriptCount },
            { name: "Audio", total: audioCount },
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

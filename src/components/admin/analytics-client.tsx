
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, TrendingDown } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Cell } from "recharts";
import { Label as PieLabel } from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '../ui/skeleton';

export interface AnalyticsData {
    userGrowthData: { date: string, users: number }[];
    revenueData: { date: string, mrr: number }[];
    planDistributionData: { name: string, value: number, fill: string }[];
    contentGenerationData: { name: string, total: number }[];
    recentSignups: { displayName: string, email: string, time: string, avatarUrl: string }[];
    summary: {
        totalUsers: { value: string; change: string };
        mrr: { value: string; change: string };
        churn: { value: string; change: string };
        activeSubs: { value: string; change: string };
    }
}

interface AnalyticsClientProps {
    initialData: AnalyticsData;
}

const ChartPlaceholder = () => (
    <div className='h-[250px] w-full flex items-center justify-center bg-muted rounded-md'>
        <p className='text-muted-foreground'>Time-series data coming soon</p>
    </div>
);

export function AnalyticsClient({ initialData }: AnalyticsClientProps) {
    const [data] = React.useState<AnalyticsData>(initialData);
    
    const totalUsersInPlans = React.useMemo(() => {
        return data.planDistributionData.reduce((acc, curr) => acc + curr.value, 0);
    }, [data.planDistributionData]);


    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Platform Analytics</h1>
                    <p className="text-muted-foreground">
                        High-level overview of platform usage and growth.
                    </p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-base font-medium">Total Users</CardTitle>
                        <Users className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{data.summary.totalUsers.value}</div>
                        <p className="text-sm text-muted-foreground">
                             {data.summary.totalUsers.change}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-base font-medium">Monthly Recurring Revenue</CardTitle>
                        <DollarSign className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{data.summary.mrr.value}</div>
                         <p className="text-sm text-muted-foreground">
                           {data.summary.mrr.change}
                        </p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-base font-medium">Churn Rate</CardTitle>
                        <TrendingDown className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{data.summary.churn.value}</div>
                         <p className="text-sm text-muted-foreground">
                            {data.summary.churn.change}
                        </p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-base font-medium">Active Subscriptions</CardTitle>
                        <Users className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{data.summary.activeSubs.value}</div>
                         <p className="text-sm text-muted-foreground">
                            {data.summary.activeSubs.change}
                        </p>
                    </CardContent>
                </Card>
            </div>

             <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>User Growth</CardTitle>
                            <CardDescription>Total users on the platform over time.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartPlaceholder />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>MRR Growth</CardTitle>
                            <CardDescription>Monthly Recurring Revenue over time.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <ChartPlaceholder />
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Content Generation</CardTitle>
                            <CardDescription>Total content items generated (mock data).</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={{total: {label: "Total"}}} className="h-[250px] w-full">
                                <BarChart data={data.contentGenerationData} layout="vertical" margin={{ left: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={10} width={80} fontSize={14} />
                                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                                    <Bar dataKey="total" radius={4}>
                                        {data.contentGenerationData.map((entry, index) => <Cell key={entry.name} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />)}
                                    </Bar>
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </div>
                 <div className="space-y-6">
                     <Card>
                        <CardHeader>
                            <CardTitle>Subscription Breakdown</CardTitle>
                            <CardDescription>Distribution of users across subscription plans.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={{}} className="mx-auto aspect-square h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                        <Pie 
                                            data={data.planDistributionData} 
                                            dataKey="value" 
                                            nameKey="name" 
                                            cx="50%" 
                                            cy="50%" 
                                            innerRadius={60} 
                                            outerRadius={90} 
                                            strokeWidth={5}
                                        >
                                            {data.planDistributionData.map((entry) => (
                                                <Cell key={entry.name} fill={entry.fill} />
                                            ))}
                                            <PieLabel
                                                value={totalUsersInPlans.toLocaleString()}
                                                position="center"
                                                className="fill-foreground text-3xl font-bold"
                                            />
                                            <PieLabel
                                                value="Users"
                                                position="center"
                                                dy={20}
                                                className="fill-muted-foreground text-base"
                                            />
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Recent Signups</CardTitle>
                            <CardDescription>The latest users to join the platform.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {data.recentSignups.map((user) => (
                                <div key={user.email} className="flex items-center gap-4">
                                    <Avatar>
                                        <AvatarImage src={user.avatarUrl} data-ai-hint="user portrait"/>
                                        <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <p className="font-semibold text-sm truncate">{user.displayName}</p>
                                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{user.time}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

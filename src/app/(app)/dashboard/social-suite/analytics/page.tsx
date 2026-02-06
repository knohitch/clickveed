
'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CalendarDays, Heart, MessageSquare, Share2, Users, BarChart3 } from "lucide-react";
import { 
    Facebook,
    Instagram,
    Youtube,
} from "lucide-react";
import { getConnections } from "@/server/actions/social-actions";
import { Skeleton } from "@/components/ui/skeleton";

// A placeholder for a TikTok icon
const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-2.43.05-4.84-.95-6.6-2.73-1.75-1.78-2.55-4.16-2.4-6.6.14-2.44 1.11-4.75 2.87-6.36 1.75-1.62 4.06-2.43 6.42-2.29.02 1.52.02 3.04.01 4.56-.52-.01-1.04.04-1.56.04-1.29 0-2.54.49-3.47 1.44-.92.95-1.39 2.22-1.38 3.54.02 1.37.47 2.68 1.44 3.63.97.96 2.29 1.41 3.63 1.41.02 0 .02 0 .03 0 .86 0 1.69-.21 2.44-.6.81-.39 1.49-.96 1.99-1.66.44-.6.75-1.32.92-2.09.13-.6.18-1.22.2-1.84.02-3.33.01-6.67 0-10.01z" />
    </svg>
);

interface AnalyticsData {
    followerData: Array<{ date: string; [key: string]: string | number }>;
    engagementData: Array<{ platform: string; likes: number; comments: number; shares: number }>;
    topContent: Array<{ id: number; title: string; platform: string; views: string; likes: string; comments: string }>;
    totalFollowers: number;
    engagementRate: number;
    totalViews: string;
    followerGrowth: number;
    engagementGrowth: number;
    viewsGrowth: string;
}

const platformIcons: { [key: string]: React.ElementType } = {
  YouTube: Youtube,
  Instagram: Instagram,
  TikTok: TikTokIcon,
  Facebook: Facebook,
};

const chartConfig = {
    YouTube: { label: 'YouTube', color: 'hsl(var(--color-youtube))' },
    Instagram: { label: 'Instagram', color: 'hsl(var(--color-instagram))' },
    TikTok: { label: 'TikTok', color: 'hsl(var(--color-tiktok))' },
    Facebook: { label: 'Facebook', color: 'hsl(var(--color-facebook))' },
    likes: { label: 'Likes', color: 'hsl(var(--color-likes))' },
    comments: { label: 'Comments', color: 'hsl(var(--color-comments))' },
    shares: { label: 'Shares', color: 'hsl(var(--color-shares))' },
}


export default function AnalyticsPage() {
    const [connections, setConnections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('last-30-days');

    const loadConnections = async () => {
        setLoading(true);
        try {
            const userConnections = await getConnections();
            setConnections(userConnections);
        } catch (error) {
            console.error('Failed to load connections:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadConnections();
    }, []);

    // Generate empty data based on connected platforms
    const generateAnalyticsData = (): AnalyticsData => {
        const connectedPlatforms = connections.map(c => c.platform);
        const platforms = ['YouTube', 'Instagram', 'TikTok', 'Facebook'].filter(p => 
            connectedPlatforms.some(cp => cp.toLowerCase().includes(p.toLowerCase()))
        );

        return {
            followerData: [],
            engagementData: platforms.map(platform => ({
                platform,
                likes: 0,
                comments: 0,
                shares: 0
            })),
            topContent: [],
            totalFollowers: 0,
            engagementRate: 0,
            totalViews: '0',
            followerGrowth: 0,
            engagementGrowth: 0,
            viewsGrowth: '0'
        };
    };

    const analyticsData = generateAnalyticsData();

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold font-headline">Social Media Analytics</h1>
                        <p className="text-foreground/80">Loading analytics data...</p>
                    </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-16 mb-2" />
                                <Skeleton className="h-3 w-32" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-6 w-32 mb-2" />
                                <Skeleton className="h-4 w-48" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-[300px] w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (connections.length === 0) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold font-headline">Social Media Analytics</h1>
                        <p className="text-foreground/80">Connect your social media accounts to see analytics.</p>
                    </div>
                </div>
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Connected Accounts</h3>
                        <p className="text-muted-foreground text-center mb-4">
                            Connect your social media accounts in the Integrations section to start viewing analytics.
                        </p>
                        <Button asChild>
                            <Link href="/dashboard/social-suite/integrations">
                                Go to Integrations
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                     <h1 className="text-3xl font-bold font-headline">Social Media Analytics</h1>
                     <p className="text-foreground/80">
                        An overview of your content performance across {connections.length} connected platform{connections.length !== 1 ? 's' : ''}.
                    </p>
                </div>
                 <div className="flex items-center gap-2">
                    <Select value={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger className="w-[180px]">
                            <CalendarDays className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Select date range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="last-7-days">Last 7 days</SelectItem>
                            <SelectItem value="last-30-days">Last 30 days</SelectItem>
                            <SelectItem value="last-90-days">Last 90 days</SelectItem>
                            <SelectItem value="all-time">All time</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-base font-medium">Total Followers</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{analyticsData.totalFollowers.toLocaleString()}</div>
                        <p className="text-sm text-foreground/80">+{analyticsData.followerGrowth.toLocaleString()} from last month</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-base font-medium">Engagement Rate</CardTitle>
                        <Heart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{analyticsData.engagementRate.toFixed(2)}%</div>
                        <p className="text-sm text-foreground/80">+{analyticsData.engagementGrowth.toFixed(1)}% from last month</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-base font-medium">Total Views</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{analyticsData.totalViews}</div>
                        <p className="text-sm text-foreground/80">+{analyticsData.viewsGrowth} from last month</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">Follower Growth</CardTitle>
                        <CardDescription className="text-base text-foreground/80">Follower trends across connected platforms.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {analyticsData.followerData.length > 0 ? (
                            <ChartContainer config={chartConfig} className="h-[300px] w-full">
                                <LineChart data={analyticsData.followerData}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={14} />
                                    <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={14} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    {analyticsData.followerData.length > 0 && Object.keys(analyticsData.followerData[0]).filter(key => key !== 'date').map((platform) => (
                                        <Line key={platform} type="monotone" dataKey={platform} stroke={`var(--color-${platform})`} strokeWidth={2} dot={false} />
                                    ))}
                                </LineChart>
                            </ChartContainer>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                No follower data available yet
                            </div>
                        )}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">Engagement by Platform</CardTitle>
                        <CardDescription className="text-base text-foreground/80">Likes, comments, and shares in the selected period.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {analyticsData.engagementData.some(d => d.likes > 0 || d.comments > 0 || d.shares > 0) ? (
                            <ChartContainer config={chartConfig} className="h-[300px] w-full">
                                <BarChart data={analyticsData.engagementData} layout="vertical" stackOffset="expand">
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="platform" type="category" tickLine={false} axisLine={false} tickMargin={10} width={80} fontSize={14} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="likes" fill="var(--color-likes)" stackId="a" radius={[4, 0, 0, 4]} />
                                    <Bar dataKey="comments" fill="var(--color-comments)" stackId="a" />
                                    <Bar dataKey="shares" fill="var(--color-shares)" stackId="a" radius={[0, 4, 4, 0]}/>
                                </BarChart>
                            </ChartContainer>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                No engagement data available yet
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            
             <Card>
                <CardHeader>
                    <CardTitle>Top Performing Content</CardTitle>
                    <CardDescription className="text-base text-foreground/80">Your most engaging posts from the selected period.</CardDescription>
                </CardHeader>
                <CardContent>
                    {analyticsData.topContent.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-lg">Content</TableHead>
                                    <TableHead className="hidden sm:table-cell text-lg">Platform</TableHead>
                                    <TableHead className="text-right text-lg">Views</TableHead>
                                    <TableHead className="text-right text-lg">Likes</TableHead>
                                    <TableHead className="text-right text-lg">Comments</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {analyticsData.topContent.map((post) => {
                                    const Icon = platformIcons[post.platform];
                                    return (
                                        <TableRow key={post.id}>
                                            <TableCell>
                                                <div className="font-medium">{post.title}</div>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell">
                                                <div className="flex items-center gap-2">
                                                    {Icon && <Icon className="h-4 w-4" />}
                                                    {post.platform}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">{post.views}</TableCell>
                                            <TableCell className="text-right">{post.likes}</TableCell>
                                            <TableCell className="text-right">{post.comments}</TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="py-8 text-center text-muted-foreground">
                            No content data available yet
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>
    );
}

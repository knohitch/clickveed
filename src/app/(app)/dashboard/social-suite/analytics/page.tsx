
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpRight, BarChart3, CalendarDays, Heart, MessageSquare, Share2, Users } from "lucide-react";
import { 
    Facebook,
    Instagram,
    Youtube,
} from "lucide-react";

// A placeholder for a TikTok icon
const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-2.43.05-4.84-.95-6.6-2.73-1.75-1.78-2.55-4.16-2.4-6.6.14-2.44 1.11-4.75 2.87-6.36 1.75-1.62 4.06-2.43 6.42-2.29.02 1.52.02 3.04.01 4.56-.52-.01-1.04.04-1.56.04-1.29 0-2.54.49-3.47 1.44-.92.95-1.39 2.22-1.38 3.54.02 1.37.47 2.68 1.44 3.63.97.96 2.29 1.41 3.63 1.41.02 0 .02 0 .03 0 .86 0 1.69-.21 2.44-.6.81-.39 1.49-.96 1.99-1.66.44-.6.75-1.32.92-2.09.13-.6.18-1.22.2-1.84.02-3.33.01-6.67 0-10.01z" />
    </svg>
);


const followerData = [
    { date: 'Jan 24', YouTube: 1200, Instagram: 2400, TikTok: 1800 },
    { date: 'Feb 24', YouTube: 1400, Instagram: 2600, TikTok: 2200 },
    { date: 'Mar 24', YouTube: 1550, Instagram: 3000, TikTok: 2800 },
    { date: 'Apr 24', YouTube: 1600, Instagram: 3200, TikTok: 3500 },
    { date: 'May 24', YouTube: 1800, Instagram: 3500, TikTok: 4200 },
    { date: 'Jun 24', YouTube: 2100, Instagram: 3800, TikTok: 5100 },
];

const engagementData = [
    { platform: 'YouTube', likes: 12500, comments: 3200, shares: 1500 },
    { platform: 'Instagram', likes: 25000, comments: 8500, shares: 4500 },
    { platform: 'TikTok', likes: 88000, comments: 12000, shares: 18000 },
    { platform: 'Facebook', likes: 9500, comments: 2100, shares: 1200 },
];

const topContent = [
    { id: 1, title: 'Viral TikTok Dance Challenge', platform: 'TikTok', views: '2.1M', likes: '350k', comments: '12k' },
    { id: 2, title: 'How to DIY Your Kitchen Backsplash', platform: 'YouTube', views: '350k', likes: '15k', comments: '2.1k' },
    { id: 3, title: 'Our New Summer Collection Lookbook', platform: 'Instagram', views: '1.2M', likes: '120k', comments: '5.5k' },
    { id: 4, title: 'A Day in the Life of a Software Engineer', platform: 'YouTube', views: '150k', likes: '8k', comments: '1.2k' },
    { id: 5, title: 'Quick & Healthy Lunch Ideas', platform: 'Facebook', views: '89k', likes: '4.2k', comments: '890' },
];

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
    likes: { label: 'Likes', color: 'hsl(var(--color-likes))' },
    comments: { label: 'Comments', color: 'hsl(var(--color-comments))' },
    shares: { label: 'Shares', color: 'hsl(var(--color-shares))' },
}


export default function AnalyticsPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                     <h1 className="text-3xl font-bold font-headline">Social Media Analytics</h1>
                     <p className="text-foreground/80">
                        An overview of your content performance.
                    </p>
                </div>
                 <div className="flex items-center gap-2">
                    <Select defaultValue="last-30-days">
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
                        <div className="text-3xl font-bold">125,430</div>
                        <p className="text-sm text-foreground/80">+2,012 from last month</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-base font-medium">Engagement Rate</CardTitle>
                        <Heart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">4.85%</div>
                        <p className="text-sm text-foreground/80">+0.5% from last month</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-base font-medium">Total Views</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">3.8M</div>
                        <p className="text-sm text-foreground/80">+1.2M from last month</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">Follower Growth</CardTitle>
                        <CardDescription className="text-base text-foreground/80">Follower trends across major platforms.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="h-[300px] w-full">
                            <LineChart data={followerData}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={14} />
                                <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={14} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Line type="monotone" dataKey="YouTube" stroke="var(--color-YouTube)" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="Instagram" stroke="var(--color-Instagram)" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="TikTok" stroke="var(--color-TikTok)" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">Engagement by Platform</CardTitle>
                        <CardDescription className="text-base text-foreground/80">Likes, comments, and shares in the last 30 days.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <ChartContainer config={chartConfig} className="h-[300px] w-full">
                            <BarChart data={engagementData} layout="vertical" stackOffset="expand">
                                <XAxis type="number" hide />
                                <YAxis dataKey="platform" type="category" tickLine={false} axisLine={false} tickMargin={10} width={80} fontSize={14} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="likes" fill="var(--color-likes)" stackId="a" radius={[4, 0, 0, 4]} />
                                <Bar dataKey="comments" fill="var(--color-comments)" stackId="a" />
                                <Bar dataKey="shares" fill="var(--color-shares)" stackId="a" radius={[0, 4, 4, 0]}/>
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
            
             <Card>
                <CardHeader>
                    <CardTitle>Top Performing Content</CardTitle>
                    <CardDescription className="text-base text-foreground/80">Your most engaging posts from the last 30 days.</CardDescription>
                </CardHeader>
                <CardContent>
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
                            {topContent.map((post) => {
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
                </CardContent>
            </Card>

        </div>
    );
}

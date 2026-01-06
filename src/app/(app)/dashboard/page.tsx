
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Label } from 'recharts';
import { Bot, Clapperboard, Edit, PlusCircle, HardDrive, ImageIcon, Goal, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { getUserUsageStats } from '@/server/actions/user-actions';
import { useAuth } from '@/contexts/auth-context';

export default function DashboardPage() {
  const { data: session } = useSession();
  const { subscriptionPlan, userPlanDetails, loading: authLoading } = useAuth();
  
  const [usage, setUsage] = React.useState({ projects: 0, mediaAssets: 0, aiCredits: 0, storage: 0 });
  const [loadingUsage, setLoadingUsage] = React.useState(true);
  
  React.useEffect(() => {
    async function loadUsage() {
      if (session?.user?.id) {
          setLoadingUsage(true);
          const stats = await getUserUsageStats();
          setUsage(stats);
          setLoadingUsage(false);
      }
    }
    loadUsage();
  }, [session]);

  const [goal, setGoal] = React.useState({
    type: 'projects',
    target: 10,
  });
  
  const goalProgress = usage.projects;

  const [editingGoal, setEditingGoal] = React.useState({
    type: goal.type,
    target: goal.target,
  });

  const [isEditingGoal, setIsEditingGoal] = React.useState(false);
  
  React.useEffect(() => {
    if (isEditingGoal) {
      setEditingGoal({
        type: goal.type,
        target: goal.target,
      });
    }
  }, [isEditingGoal, goal]);
  
  const handleSetGoal = () => {
    setGoal({ ...editingGoal });
    setIsEditingGoal(false);
  }

  const goalProgressPercent = goal.target > 0 ? (goalProgress / goal.target) * 100 : 0;
  
  const limits = {
      videos: subscriptionPlan?.videoExports,
      aiCredits: subscriptionPlan?.aiCredits,
      storage: subscriptionPlan?.storageGB,
  };

  const storageUsagePercent = limits.storage ? (usage.storage / limits.storage) * 100 : 0;
  
  const contentData = [
    { type: 'Projects', count: usage.projects, fill: 'hsl(var(--chart-1))' },
    { type: 'Media Files', count: usage.mediaAssets, fill: 'hsl(var(--chart-2))' },
    { type: 'AI Credits', count: usage.aiCredits, fill: 'hsl(var(--chart-3))' },
  ];

  const isLoading = loadingUsage || authLoading;


  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold font-headline">Welcome Back, {session?.user?.name || 'Creator'}!</h1>
            <p className="text-muted-foreground">Here's a snapshot of your creative workspace.</p>
        </div>
        <Button size="lg" asChild>
          <Link href="/dashboard/projects?action=create">
            <PlusCircle className="mr-2 h-5 w-5" />
            Create New Project
          </Link>
        </Button>
       </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Projects Created</CardTitle>
            <Clapperboard className="h-8 w-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoading ? <Loader2 className="h-8 w-8 animate-spin"/> : <div className="text-4xl font-bold">{usage.projects}</div>}
             <p className="text-base text-muted-foreground">
                {limits.videos ? `${limits.videos - usage.projects} remaining` : 'Unlimited'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Media Assets</CardTitle>
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoading ? <Loader2 className="h-8 w-8 animate-spin"/> : <div className="text-4xl font-bold">{usage.mediaAssets}</div>}
             <p className="text-base text-muted-foreground">
                Total image, video, and audio files.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">AI Credits Used</CardTitle>
            <Bot className="h-8 w-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Loader2 className="h-8 w-8 animate-spin"/> : <div className="text-4xl font-bold">{usage.aiCredits.toLocaleString()}</div>}
            <p className="text-base text-muted-foreground">
                {limits.aiCredits ? `${(limits.aiCredits - usage.aiCredits).toLocaleString()} remaining` : 'Unlimited'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Storage Used</CardTitle>
            <HardDrive className="h-8 w-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Loader2 className="h-8 w-8 animate-spin"/> : <div className="text-4xl font-bold">{usage.storage.toFixed(1)} / {limits.storage || '∞'} GB</div>}
            <Progress value={storageUsagePercent} className="mt-2 h-2" />
          </CardContent>
          <CardFooter className="pt-2 pb-3">
             <p className="text-xs text-muted-foreground">Based on your <span className="font-semibold">{subscriptionPlan?.name || 'Free'} Plan</span></p>
          </CardFooter>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Content Generation Analytics</CardTitle>
                    <CardDescription>Your content creation trends for this month.</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] w-full">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground text-center">
                            <p>Loading analytics...</p>
                        </div>
                    ) : (
                         <ChartContainer config={{ count: { label: "Count" }}} className="w-full h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart accessibilityLayer data={contentData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis
                                        dataKey="type"
                                        tickLine={false}
                                        tickMargin={10}
                                        axisLine={false}
                                    />
                                    <YAxis />
                                    <ChartTooltip
                                        cursor={false}
                                        content={<ChartTooltipContent hideLabel />}
                                    />
                                    <Bar dataKey="count" radius={8}>
                                        <Label
                                            position="top"
                                            offset={12}
                                            className="fill-foreground text-sm"
                                            formatter={(value: number) => value.toLocaleString()}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    )}
                </CardContent>
            </Card>
        </div>

        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Current Plan</CardTitle>
                    <CardDescription>Manage your subscription and billing details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                        <div className="space-y-1">
                            <h4 className="font-bold text-lg">{subscriptionPlan?.name || 'Free'} Plan</h4>
                            <p className="text-sm text-muted-foreground">
                                {userPlanDetails.hasPremiumFeatures ? `Renews on ${userPlanDetails.renewsOn}` : 'Upgrade to unlock premium features.'}
                            </p>
                        </div>
                         <Star className="h-8 w-8 text-yellow-500" />
                    </div>
                    <Button className="w-full" asChild>
                        <Link href="/dashboard/settings">{userPlanDetails.hasPremiumFeatures ? 'Manage Subscription' : 'Upgrade Plan'}</Link>
                    </Button>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Weekly Goal</CardTitle>
                        {!isEditingGoal && (
                            <CardDescription>
                                Your goal is to create {goal.target} {goal.type}.
                            </CardDescription>
                        )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setIsEditingGoal(!isEditingGoal)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent>
                    {isEditingGoal ? (
                        <div className="space-y-4">
                            <div className='flex items-center gap-2'>
                               <span className='text-sm font-medium'>My goal is to</span>
                               <Select defaultValue={editingGoal.type} onValueChange={(value) => setEditingGoal(prev => ({ ...prev, type: value }))}>
                                    <SelectTrigger className="w-[150px]">
                                        <SelectValue placeholder="Select goal" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="projects">Create Projects</SelectItem>
                                        <SelectItem value="scripts">Generate Scripts</SelectItem>
                                        <SelectItem value="shorts">Create Shorts</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className='flex items-center gap-2'>
                                <span className='text-sm font-medium'>and I will create</span>
                                <Input 
                                    type="number" 
                                    value={editingGoal.target}
                                    onChange={(e) => setEditingGoal(prev => ({...prev, target: Number(e.target.value)}))}
                                    className="w-[80px]"
                                />
                                 <span className='text-sm font-medium'>this week.</span>
                            </div>
                            <Button onClick={handleSetGoal} className="w-full">Set Goal</Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <span className="text-4xl font-bold">{goalProgress} / {goal.target}</span>
                            <Progress value={goalProgressPercent} className="flex-1 h-3" />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}

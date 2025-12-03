

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Play, Eye, Copy, Terminal, HeartPulse } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, subMinutes } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const initialCronJobs = [
    { id: 1, name: "Daily User Signup Report", schedule: "0 1 * * *", description: "Sends an email report of new user signups from the previous day.", isActive: true, commandSlug: "daily-signup-report" },
    { id: 2, name: "Weekly Content Analytics Rollup", schedule: "0 2 * * 1", description: "Aggregates content generation metrics for the past week into summary tables.", isActive: true, commandSlug: "weekly-analytics-rollup" },
    { id: 3, name: "Hourly API Health Check", schedule: "0 * * * *", description: "Pings critical third-party API endpoints and flags any services that are down.", isActive: true, commandSlug: "hourly-api-health-check" },
    { id: 4, name: "Monthly Subscription Renewal", schedule: "0 0 1 * *", description: "Processes recurring subscription payments for all active users.", isActive: false, commandSlug: "monthly-subscription-renewal" },
    { id: 5, name: "Nightly Database Backup", schedule: "0 3 * * *", description: "Creates a backup of the PostgreSQL database.", isActive: true, commandSlug: "nightly-db-backup" },
    { id: 6, name: "Autorotation Health Check", schedule: "*/30 * * * *", description: "Checks the status of autorotation providers for video and audio generation.", isActive: true, commandSlug: "autorotation-health-check" },
];

const generateSimulatedLogs = (jobName: string) => {
    const now = new Date();
    return `
[${format(subMinutes(now, 2), 'yyyy-MM-dd HH:mm:ss')}] INFO: Starting job: ${jobName}
[${format(subMinutes(now, 2), 'yyyy-MM-dd HH:mm:ss')}] INFO: Fetching required data...
[${format(subMinutes(now, 1), 'yyyy-MM-dd HH:mm:ss')}] INFO: Data processed successfully.
[${format(now, 'yyyy-MM-dd HH:mm:ss')}] INFO: Job finished successfully. Duration: 1.25s
    `.trim();
}


export default function CronJobsPage() {
    const { toast } = useToast();
    const [runningJob, setRunningJob] = useState<number | null>(null);
    const [cronJobs, setCronJobs] = useState(initialCronJobs);
    const [appUrl, setAppUrl] = useState('');

    useEffect(() => {
        // This ensures the window object is available before trying to access it.
        if (typeof window !== 'undefined') {
            setAppUrl(window.location.origin);
        }
    }, []);

    const handleRunJob = (jobId: number, jobName: string) => {
        setRunningJob(jobId);
        toast({
            title: `Running Job: ${jobName}`,
            description: "The scheduled task has been manually triggered.",
        });

        setTimeout(() => {
            toast({
                title: `Job Complete: ${jobName}`,
                description: "The task finished successfully.",
            });
            setRunningJob(null);
        }, 3000); // Simulate a 3-second job run
    };

    const toggleJobStatus = (jobId: number) => {
        setCronJobs(prevJobs => 
            prevJobs.map(job => 
                job.id === jobId ? { ...job, isActive: !job.isActive } : job
            )
        );
    }
    
    const copyCommand = (command: string) => {
        navigator.clipboard.writeText(command);
        toast({
            title: "Command Copied!",
            description: "The cron command has been copied to your clipboard.",
        });
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Cron Job Management</h1>
                <p className="text-muted-foreground">
                    Monitor, run, and configure scheduled tasks for the platform.
                </p>
            </div>

            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Setup Instructions</AlertTitle>
                <AlertDescription>
                   To automate these tasks, use the commands below in your hosting environment's scheduler (e.g., a Linux server's crontab or Coolify's 'Scheduled Tasks'). 
                   The commands are dynamically generated based on your application's URL. You must replace <strong>YOUR_CRON_SECRET</strong> with the secret key from your environment variables to protect the endpoints.
                </AlertDescription>
            </Alert>
            
            <Card>
                <CardHeader>
                    <CardTitle>Scheduled Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[200px]">Job Name</TableHead>
                                <TableHead>Schedule</TableHead>
                                <TableHead>Command</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {cronJobs.map((job) => {
                                const commandText = appUrl 
                                    ? `curl -X POST -H "Authorization: Bearer YOUR_CRON_SECRET" ${appUrl}/api/cron/${job.commandSlug}`
                                    : 'Loading command...';
                                return (
                                <TableRow key={job.id}>
                                    <TableCell className="font-medium">{job.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{job.schedule}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 font-mono text-xs max-w-md">
                                            <Terminal className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                            <code className="flex-1 truncate p-2 bg-muted rounded-md">{commandText}</code>
                                            <Button variant="ghost" size="icon" onClick={() => copyCommand(commandText)} className="flex-shrink-0" disabled={!appUrl}>
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                id={`status-${job.id}`}
                                                checked={job.isActive}
                                                onCheckedChange={() => toggleJobStatus(job.id)}
                                                aria-label="Toggle job status"
                                            />
                                            <Badge variant={job.isActive ? 'default' : 'secondary'}>
                                                {job.isActive ? 'Active' : 'Paused'}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    Logs
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-2xl">
                                                <DialogHeader>
                                                    <DialogTitle>{job.name}</DialogTitle>
                                                    <DialogDescription>
                                                        {job.description}
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-4">
                                                    <div>
                                                        <strong>Schedule:</strong> <Badge variant="outline">{job.schedule}</Badge>
                                                    </div>
                                                     <div>
                                                        <strong className="text-sm font-medium">Simulated Logs:</strong>
                                                        <pre className="mt-2 w-full rounded-md bg-muted p-4 text-xs font-mono overflow-x-auto">
                                                            <code>
                                                                {generateSimulatedLogs(job.name)}
                                                            </code>
                                                        </pre>
                                                     </div>
                                                </div>
                                            </DialogContent>
                                        </Dialog>

                                        <Button 
                                            variant="secondary" 
                                            size="sm" 
                                            onClick={() => handleRunJob(job.id, job.name)}
                                            disabled={!!runningJob || !job.isActive}
                                        >
                                            <Play className="mr-2 h-4 w-4" />
                                            {runningJob === job.id ? 'Running...' : 'Run Now'}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}


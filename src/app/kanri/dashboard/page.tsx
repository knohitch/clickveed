

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, BarChart3, Settings, ShieldCheck, ArrowUpRight, MessageSquare, Power, Clock, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAdminSettings } from '@/contexts/admin-settings-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { SupportTicket } from '@/lib/support-actions';
import { getTickets } from '@/lib/support-actions';
import { Skeleton } from '@/components/ui/skeleton';


const getStatusVariant = (status: SupportTicket['status']) => {
    switch (status) {
        case 'Open': return 'destructive';
        case 'Pending': return 'secondary';
        case 'Resolved': return 'default';
        default: return 'outline';
    }
}

export default function AdminDashboardPage() {
    const { isSupportOnline, setIsSupportOnline } = useAdminSettings();
    const router = useRouter();
    const [recentTickets, setRecentTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTickets = async () => {
            setLoading(true);
            const allTickets = await getTickets();
            const openTickets = allTickets.filter(t => t.status === 'Open').slice(0, 5);
            setRecentTickets(openTickets);
            setLoading(false);
        };
        fetchTickets();
    }, []);

    const openTicketCount = recentTickets.length;

    const overviewCards = [
        {
            title: "Open Tickets",
            value: openTicketCount,
            change: "Ready for response",
            icon: MessageSquare,
            href: "/kanri/support"
        },
    ];

    const handleTicketClick = (ticketId: string) => {
        router.push(`/kanri/support?ticket=${ticketId}`);
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Support Dashboard</h1>
                <p className="text-muted-foreground">
                    Welcome to the support control panel.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {overviewCards.map((card) => (
                    <Card key={card.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-base font-medium">{card.title}</CardTitle>
                            <card.icon className="h-5 w-5 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{loading ? <Skeleton className="h-8 w-16" /> : card.value}</div>
                            <p className="text-sm text-muted-foreground">{card.change}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Open Tickets</CardTitle>
                        <CardDescription>A list of the most recent unresolved support tickets.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Subject</TableHead>
                                    <TableHead className="text-right w-[100px]">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell colSpan={3} className="py-2">
                                                <Skeleton className="h-10 w-full" />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : recentTickets.length > 0 ? (
                                    recentTickets.map(ticket => (
                                        <TableRow key={ticket.id} onClick={() => handleTicketClick(ticket.id)} className="cursor-pointer">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={ticket.userAvatar ?? ''} />
                                                        <AvatarFallback>{ticket.userName.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <span>{ticket.userName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">{ticket.subject}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={getStatusVariant(ticket.status)}>
                                                    {ticket.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                     <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">
                                            No open tickets found. Great job!
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Support Status</CardTitle>
                        <CardDescription>Set the availability of the support team.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div>
                                <Label htmlFor="support-status-switch" className="text-base font-medium flex items-center gap-2">
                                    <Power className={`h-4 w-4 transition-colors ${isSupportOnline ? 'text-green-500' : 'text-red-500'}`} />
                                    Team is currently {isSupportOnline ? "Online" : "Away"}
                                </Label>
                                <CardDescription className="text-sm mt-1">
                                    Toggling this will affect the user-facing support widget.
                                </CardDescription>
                            </div>
                            <Switch
                                id="support-status-switch"
                                checked={isSupportOnline}
                                onCheckedChange={setIsSupportOnline}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

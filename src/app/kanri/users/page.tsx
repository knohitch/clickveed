

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpCircle, MoreHorizontal, Search, UserSearch } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import type { UserWithRole } from "@/server/actions/user-actions";
import { getUsers, updateUserPlan } from "@/server/actions/user-actions";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminSettings } from "@/contexts/admin-settings-context";
import { toast } from "sonner";


type FilterStatus = 'All' | 'Verified' | 'Unverified';

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserWithRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<FilterStatus>('All');
    const { plans } = useAdminSettings();
    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

    // Plan change dialog state
    const [planChangeDialog, setPlanChangeDialog] = useState<{ userId: string; userName: string; currentPlan: string } | null>(null);
    const [selectedPlanId, setSelectedPlanId] = useState<string>('');
    const [resetUsage, setResetUsage] = useState(true);
    const [notifyUser, setNotifyUser] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            const fetchedUsers = await getUsers();
            setUsers(fetchedUsers);
            setLoading(false);
        };
        fetchUsers();
    }, []);

    const handlePlanChange = async (userId: string, planId: string) => {
        setUpdatingUserId(userId);
        try {
            const result = await updateUserPlan(userId, planId, { resetUsage, notifyUser });
            if (result.success) {
                toast.success(result.message);
                const fetchedUsers = await getUsers();
                setUsers(fetchedUsers);
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to update user plan');
        } finally {
            setUpdatingUserId(null);
            setPlanChangeDialog(null);
            setResetUsage(true);
            setNotifyUser(true);
        }
    };

    const openPlanChangeDialog = (user: UserWithRole) => {
        const currentPlanName = user.plan || 'Free';
        setPlanChangeDialog({ userId: user.id, userName: user.name || user.email || 'User', currentPlan: currentPlanName });
        setSelectedPlanId(plans.find(p => p.name === currentPlanName)?.id || '');
        setResetUsage(true);
        setNotifyUser(true);
    };

    const getUserPlanName = (planName: string | undefined) => {
        return planName || 'Free';
    };

    const filteredUsers = users.filter(user => {
        const searchMatch = user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || user.email?.toLowerCase().includes(searchQuery.toLowerCase());
        const filterMatch = filter === 'All' || (filter === 'Verified' && user.emailVerified) || (filter === 'Unverified' && !user.emailVerified);
        return searchMatch && filterMatch;
    });

    const getUserInitial = (user: UserWithRole) => {
        if (user.name) return user.name.charAt(0).toUpperCase();
        if (user.email) return user.email.charAt(0).toUpperCase();
        return '?';
    }


    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">View Users</h1>
                <p className="text-muted-foreground">
                    Look up user information and manage user plans.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>All Users</CardTitle>
                    <CardDescription>A list of all users in the system.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4 mb-4 justify-between">
                        <div className="relative w-full md:max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name or email"
                                className="pl-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                           <Button variant={filter === 'All' ? 'default' : 'outline'} onClick={() => setFilter('All')}>All Users</Button>
                           <Button variant={filter === 'Verified' ? 'default' : 'outline'} onClick={() => setFilter('Verified')}>Verified</Button>
                           <Button variant={filter === 'Unverified' ? 'default' : 'outline'} onClick={() => setFilter('Unverified')}>Unverified</Button>
                        </div>
                   </div>
                    <Table>
                         <TableHeader>
                             <TableRow>
                                 <TableHead>User</TableHead>
                                 <TableHead className="hidden md:table-cell">Email</TableHead>
                                 <TableHead className="hidden sm:table-cell">Plan</TableHead>
                                 <TableHead className="hidden sm:table-cell">Status</TableHead>
                                 <TableHead><span className="sr-only">Actions</span></TableHead>
                             </TableRow>
                         </TableHeader>
                         <TableBody>
                             {loading ? (
                                 Array(5).fill(0).map((_, i) => (
                                 <TableRow key={i}>
                                     <TableCell colSpan={5} className="p-4">
                                          <Skeleton className="h-10 bg-muted" />
                                     </TableCell>
                                 </TableRow>
                                 ))
                             ) : filteredUsers.length > 0 ? (
                                 filteredUsers.map(user => (
                                     <TableRow key={user.id}>
                                         <TableCell>
                                             <div className="flex items-center gap-3">
                                                 <Avatar>
                                                     <AvatarImage src={user.image ?? ''} alt={user.name || 'User'} />
                                                     <AvatarFallback>{getUserInitial(user)}</AvatarFallback>
                                                 </Avatar>
                                                 <div className="font-medium">{user.name || 'No Name'}</div>
                                             </div>
                                         </TableCell>
                                         <TableCell className="hidden md:table-cell">{user.email}</TableCell>
                                         <TableCell className="hidden sm:table-cell">
                                             <div className="flex items-center gap-2">
                                                 <Badge variant="outline">
                                                     {getUserPlanName(user.plan)}
                                                 </Badge>
                                                 <Button
                                                     variant="ghost"
                                                     size="sm"
                                                     className="h-6 px-2 text-xs"
                                                     onClick={() => openPlanChangeDialog(user)}
                                                 >
                                                     <ArrowUpCircle className="h-3 w-3 mr-1" />
                                                     Change
                                                 </Button>
                                             </div>
                                         </TableCell>
                                         <TableCell className="hidden sm:table-cell">
                                             <Badge variant={user.emailVerified ? 'default' : 'destructive'}>
                                                 {user.emailVerified ? 'Verified' : 'Not Verified'}
                                             </Badge>
                                         </TableCell>
                                         <TableCell>
                                             <DropdownMenu>
                                                 <DropdownMenuTrigger asChild>
                                                     <Button aria-haspopup="true" size="icon" variant="ghost">
                                                         <MoreHorizontal className="h-4 w-4" />
                                                         <span className="sr-only">Toggle menu</span>
                                                     </Button>
                                                 </DropdownMenuTrigger>
                                                 <DropdownMenuContent align="end">
                                                     <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                     <DropdownMenuSeparator />
                                                     <DropdownMenuItem>View Details</DropdownMenuItem>
                                                     <DropdownMenuSeparator />
                                                     {plans.length > 0 ? (
                                                         <DropdownMenuSub>
                                                             <DropdownMenuSubTrigger>
                                                                 <ArrowUpCircle className="h-4 w-4 mr-2" />
                                                                 <span>Change Plan</span>
                                                             </DropdownMenuSubTrigger>
                                                             <DropdownMenuSubContent>
                                                                 {plans.map(plan => (
                                                                     <DropdownMenuItem
                                                                         key={plan.id}
                                                                         onClick={() => handlePlanChange(user.id, plan.id)}
                                                                         disabled={updatingUserId === user.id || user.plan === plan.name}
                                                                     >
                                                                         {plan.name} {user.plan === plan.name && ' ✓'}
                                                                     </DropdownMenuItem>
                                                                 ))}
                                                             </DropdownMenuSubContent>
                                                         </DropdownMenuSub>
                                                     ) : (
                                                         <DropdownMenuItem onClick={() => openPlanChangeDialog(user)}>
                                                             <ArrowUpCircle className="h-4 w-4 mr-2" />
                                                             Change Plan
                                                         </DropdownMenuItem>
                                                     )}
                                                 </DropdownMenuContent>
                                             </DropdownMenu>
                                         </TableCell>
                                     </TableRow>
                                 ))
                             ) : (
                                 <TableRow>
                                     <TableCell colSpan={5} className="h-24 text-center">
                                         <UserSearch className="h-12 w-12 mx-auto mb-2 text-muted-foreground"/>
                                         <p className="font-semibold">No users found</p>
                                         <p className="text-sm text-muted-foreground">Try adjusting your search or filter criteria.</p>
                                     </TableCell>
                                 </TableRow>
                             )}
                         </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Plan Change Dialog */}
            <Dialog open={!!planChangeDialog} onOpenChange={(open) => !open && setPlanChangeDialog(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Change User Plan</DialogTitle>
                        <DialogDescription>
                            Change the plan for <strong>{planChangeDialog?.userName}</strong>. Currently on: <strong>{planChangeDialog?.currentPlan}</strong>
                        </DialogDescription>
                    </DialogHeader>
                    {plans.length === 0 ? (
                        <div className="py-6 text-center space-y-2">
                            <p className="text-sm text-muted-foreground">No plans have been created yet.</p>
                            <p className="text-sm text-muted-foreground">Go to <strong>Super Admin → Plans</strong> to create plans first.</p>
                        </div>
                    ) : (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>New Plan</Label>
                                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a plan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {plans.map(plan => (
                                            <SelectItem key={plan.id} value={plan.id}>
                                                {plan.name} - ${Number(plan.priceMonthly).toFixed(2)}/mo
                                                {plan.name === planChangeDialog?.currentPlan ? ' (current)' : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label htmlFor="resetUsage" className="text-sm font-medium">Reset Usage Counters</Label>
                                    <p className="text-xs text-muted-foreground">Reset AI credits used to zero</p>
                                </div>
                                <Switch id="resetUsage" checked={resetUsage} onCheckedChange={setResetUsage} />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label htmlFor="notifyUser" className="text-sm font-medium">Notify User</Label>
                                    <p className="text-xs text-muted-foreground">Send in-app notification about plan change</p>
                                </div>
                                <Switch id="notifyUser" checked={notifyUser} onCheckedChange={setNotifyUser} />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPlanChangeDialog(null)}>Cancel</Button>
                        <Button
                            onClick={() => planChangeDialog && handlePlanChange(planChangeDialog.userId, selectedPlanId)}
                            disabled={!selectedPlanId || updatingUserId === planChangeDialog?.userId || plans.length === 0}
                        >
                            {updatingUserId === planChangeDialog?.userId ? 'Updating...' : 'Confirm Plan Change'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

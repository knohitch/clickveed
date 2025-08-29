

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MoreHorizontal, ShieldQuestion, Search, PlusCircle, UserSearch } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserWithRole } from "@/server/actions/user-actions";
import { getUsers, createPendingAdminUser } from "@/server/actions/user-actions";
import { useSession } from "next-auth/react";

const NewUserForm = ({ onUserAdded, closeDialog }: { onUserAdded: (newUser: UserWithRole) => void, closeDialog: () => void }) => {
    const { toast } = useToast();
    
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const role = formData.get('role') as 'Admin' | 'User';

        try {
            const newUser: UserWithRole = await createPendingAdminUser({ fullName: name, email, role: role });
            toast({
                title: "User Invitation Sent",
                description: `${name} will receive an email to set up their account.`,
            });
            onUserAdded(newUser);
            closeDialog();
        } catch(e: any) {
             toast({
                variant: 'destructive',
                title: "Error",
                description: e.message,
            });
        }
    }
    
    return (
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" name="name" placeholder="Full Name" required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="user.email@example.com" required />
            </div>
             <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                 <Select name="role" defaultValue="User" required>
                    <SelectTrigger id="role">
                        <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="User">User</SelectItem>
                        <SelectItem value="Admin">Admin (Support Agent)</SelectItem>
                    </SelectContent>
                </Select>
                 <p className="text-xs text-muted-foreground">The new user will receive an email to set their own password.</p>
            </div>
            <DialogFooter>
                <Button type="submit">Invite User</Button>
            </DialogFooter>
        </form>
    );
};


export default function AdminUsersPage() {
    const { data: session } = useSession();
    const { toast } = useToast();
    const [users, setUsers] = useState<UserWithRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'All' | 'User' | 'Admin' | 'Super Admin'>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [userToDelete, setUserToDelete] = useState<UserWithRole | null>(null);
    const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
    
    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            const fetchedUsers = await getUsers();
            setUsers(fetchedUsers);
            setLoading(false);
        };
        fetchUsers();
    }, []);
    
    const filteredUsers = users.filter(user => {
        const roleMatch = filter === 'All' || user.role === filter;
        const searchMatch = user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || user.email?.toLowerCase().includes(searchQuery.toLowerCase());
        return roleMatch && searchMatch;
    });

    const getUserInitial = (user: UserWithRole) => {
        if (user.name) return user.name.charAt(0).toUpperCase();
        if (user.email) return user.email.charAt(0).toUpperCase();
        return '?';
    }

    const handleApprove = (userId: string) => {
        setUsers(users.map(u => u.id === userId ? {...u, status: 'Active'} : u));
        const approvedUser = users.find(u => u.id === userId);
        toast({
            title: "User Approved",
            description: `${approvedUser?.name || 'User'} has been approved and can now log in.`
        });
    }

    const handleDelete = () => {
        if (!userToDelete || userToDelete.id === session?.user?.id) {
            toast({
                variant: 'destructive',
                title: 'Cannot Delete User',
                description: userToDelete?.id === session?.user?.id ? 'You cannot delete your own account.' : 'No user selected for deletion.'
            });
            setUserToDelete(null);
            return;
        }

        setUsers(users.filter(u => u.id !== userToDelete.id));
        toast({
            title: "User Deleted",
            description: `${userToDelete.name || 'The user'} has been removed from the system.`
        });
        setUserToDelete(null);
    }

    const handleUserAdded = (newUser: UserWithRole) => {
        setUsers([newUser, ...users]);
    }
    
    const filterOptions: ('All' | 'User' | 'Admin' | 'Super Admin')[] = ['All', 'User', 'Admin', 'Super Admin'];

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline">User Management</h1>
                    <p className="text-muted-foreground">
                        View, manage, and edit user accounts. Approve new support agents here.
                    </p>
                </div>
                 <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button><PlusCircle className="mr-2 h-4 w-4" /> New User</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New User</DialogTitle>
                            <DialogDescription>
                                Add a new user or support agent to the platform. They will receive a welcome email.
                            </DialogDescription>
                        </DialogHeader>
                        <NewUserForm onUserAdded={handleUserAdded} closeDialog={() => setCreateDialogOpen(false)} />
                    </DialogContent>
                </Dialog>
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
                            {filterOptions.map(option => (
                                <Button 
                                    key={option} 
                                    variant={filter === option ? 'default' : 'outline'}
                                    onClick={() => setFilter(option)}
                                    className="flex-1 md:flex-initial"
                                >
                                    {option === 'Admin' ? 'Support Staff' : option}
                                </Button>
                            ))}
                        </div>
                   </div>
                   <AlertDialog>
                       <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead className="hidden md:table-cell">Email</TableHead>
                                    <TableHead className="hidden sm:table-cell">Role</TableHead>
                                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                                    <TableHead><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                                            <TableCell className="hidden md:table-cell"><Skeleton className="h-10 w-full" /></TableCell>
                                            <TableCell className="hidden sm:table-cell"><Skeleton className="h-10 w-full" /></TableCell>
                                            <TableCell className="hidden sm:table-cell"><Skeleton className="h-10 w-full" /></TableCell>
                                            <TableCell><Skeleton className="h-10 w-full" /></TableCell>
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
                                                <Badge variant={user.role === 'SUPER_ADMIN' ? 'destructive' : user.role === 'ADMIN' ? 'secondary' : 'outline'}>
                                                    {user.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell">
                                                <Badge variant={user.status === 'Active' ? 'default' : 'outline'}>
                                                    {user.status}
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
                                                        {user.status === 'Pending' && (
                                                             <DropdownMenuItem onClick={() => handleApprove(user.id!)}>
                                                                <ShieldQuestion className="mr-2 h-4 w-4" />
                                                                Approve User
                                                            </DropdownMenuItem>
                                                        )}
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem
                                                                className="text-destructive"
                                                                onSelect={(e) => { e.preventDefault(); setUserToDelete(user); }}
                                                                disabled={user.id === session?.user?.id}
                                                            >
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            <UserSearch className="mx-auto h-12 w-12 text-muted-foreground" />
                                            <h3 className="mt-4 font-semibold">No users found</h3>
                                            <p className="text-sm text-muted-foreground">Try adjusting your search or filter.</p>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                       </Table>
                       <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the user account
                                    for <span className="font-bold">{userToDelete?.name || 'this user'}</span> and remove their data from our servers.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                                    Yes, delete user
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                   </AlertDialog>
                </CardContent>
            </Card>
        </div>
    );
}

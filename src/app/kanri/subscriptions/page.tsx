

'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Search, UserSearch } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAdminSettings } from '@/contexts/admin-settings-context';
import type { Plan as PlanType } from '@/contexts/admin-settings-context';
import type { UserWithRole } from '@/server/actions/user-actions';
import { getUsers } from '@/server/actions/user-actions';
import { Skeleton } from '@/components/ui/skeleton';

type PlanName = PlanType['name'];
type Status = 'Active' | 'Canceled' | 'Past Due' | 'Pending';


const getStatusVariant = (status: Status) => {
  switch (status) {
    case 'Active':
      return 'default';
    case 'Canceled':
      return 'outline';
    case 'Past Due':
      return 'destructive';
    case 'Pending':
      return 'secondary';
    default:
      return 'secondary';
  }
};

const getPlanVariant = (plan: PlanName) => {
    switch (plan) {
      case 'Pro':
        return 'secondary';
      case 'Enterprise':
        return 'default';
      default:
        return 'outline';
    }
}

export default function AdminSubscriptionsPage() {
  const { toast } = useToast();
  const { plans } = useAdminSettings();
  const [users, setUsers] = React.useState<UserWithRole[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filter, setFilter] = React.useState<PlanName | 'All'>('All');

  const filterOptions: Array<'All' | PlanName> = ['All', ...plans.map(p => p.name).sort()];
  
  React.useEffect(() => {
    const fetchUsers = async () => {
        setLoading(true);
        const fetchedUsers = await getUsers();
        setUsers(fetchedUsers);
        setLoading(false);
    };
    fetchUsers();
  }, []);

  const filteredSubscriptions = users.filter((user) => {
      const searchMatch = user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || user.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const filterMatch = filter === 'All' || user.plan === filter;
      return searchMatch && filterMatch;
  });

  const handleAction = (action: string, user: string) => {
      toast({
          title: `Action: ${action}`,
          description: `Simulated "${action}" action for user ${user}.`,
      });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">
          Subscription Management
        </h1>
        <p className="text-muted-foreground">
          View user subscription plans to assist with support requests.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>User Subscriptions</CardTitle>
          <CardDescription>
            A list of all user subscriptions on the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4 justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                {filterOptions.map(option => (
                    <Button 
                        key={option} 
                        variant={filter === option ? 'default' : 'outline'}
                        onClick={() => setFilter(option)}
                        className="flex-1 md:flex-initial"
                    >
                        {option}
                    </Button>
                ))}
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="hidden sm:table-cell">Plan</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                 Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-10 w-full" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-10 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                    </TableRow>
                 ))
              ) : filteredSubscriptions.length > 0 ? (
                  filteredSubscriptions.map((user) => (
                    <TableRow key={user.uid}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className='hidden sm:flex'>
                            <AvatarImage src={user.photoURL ?? ''} />
                            <AvatarFallback>
                              {user.displayName?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.displayName}</div>
                            <div className="hidden text-sm text-muted-foreground md:inline">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant={getPlanVariant(user.plan as PlanName)}>{user.plan}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant={getStatusVariant(user.status as Status)}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              aria-haspopup="true"
                              size="icon"
                              variant="ghost"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => handleAction('View Details', user.displayName!)}>
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <UserSearch className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 font-semibold">No subscriptions found</h3>
                    <p className="text-sm text-muted-foreground">Try adjusting your search or filter.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

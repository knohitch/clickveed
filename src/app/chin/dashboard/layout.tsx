
'use client';

import { AdminNav } from '@/components/admin-nav';
import { Logo } from '@/components/logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  SidebarRail,
} from '@/components/ui/sidebar';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogOut, PanelLeft, Settings, ArrowLeft } from 'lucide-react';
import { LoadingSpinner } from '@/components/loading-spinner';
import { ThemeSwitcher } from '@/components/theme-switcher';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession({ required: true, onUnauthenticated() { router.push('/login') }});
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  if (status === 'loading' || !session) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  const user = session.user;

  if (user.role !== 'SUPER_ADMIN') {
    // If a non-super-admin user somehow lands here, redirect them.
    router.push('/dashboard');
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <LoadingSpinner />
        </div>
    );
  }

  return (
        <SidebarProvider>
          <div className="flex min-h-screen w-full">
            <Sidebar>
                <SidebarHeader className="p-4">
                    <Logo inSidebar={true} />
                </SidebarHeader>
                <SidebarContent>
                <AdminNav type="superAdmin" />
                </SidebarContent>
                <SidebarFooter>
                <div className="flex items-center gap-3 p-4">
                    <Avatar className="h-9 w-9">
                    <AvatarImage
                        src={user.image || ''}
                        alt="User Avatar"
                    />
                    <AvatarFallback>
                        {user.email?.[0].toUpperCase() || 'A'}
                    </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden">
                    <span className="font-semibold text-sm truncate">
                        {user.name || 'Admin'}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                        {user.email}
                    </span>
                    </div>
                    <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSignOut}
                    className="text-muted-foreground hover:text-foreground ml-auto"
                    >
                    <LogOut className="h-5 w-5" />
                    </Button>
                </div>
                </SidebarFooter>
                <SidebarRail />
            </Sidebar>
            
            <SidebarInset>
                <header className="flex h-14 items-center gap-4 border-b bg-card px-6 sticky top-0 z-30">
                <SidebarTrigger>
                    <PanelLeft className="h-5 w-5" />
                </SidebarTrigger>
                <div className="flex-1">
                    <p className="text-xl font-extrabold text-destructive">Super Admin Panel</p>
                </div>
                <ThemeSwitcher />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                        <Avatar className="h-9 w-9">
                            <AvatarImage
                            src={user.image || ''}
                            alt="User Avatar"
                            />
                        <AvatarFallback>
                            {user.email?.[0].toUpperCase() || 'A'}
                        </AvatarFallback>
                        </Avatar>
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount sideOffset={8}>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.name || 'Admin'}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                        </p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        <Link href="/chin/dashboard/settings">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        <span>Back to App</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                        <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                    </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                </header>
            
            <main className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 min-h-0">{children}</main>
            </SidebarInset>
          </div>
        </SidebarProvider>
  );
}

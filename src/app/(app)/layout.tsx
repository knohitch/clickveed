
'use client';

import { DashboardNav } from '../../components/dashboard-nav';
import { Logo } from '../../components/logo';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  SidebarRail,
} from '../../components/ui/sidebar';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { LogOut, PanelLeft, Settings } from 'lucide-react';
import { LoadingSpinner } from '../../components/loading-spinner';
import { ThemeSwitcher } from '../../components/theme-switcher';
import Link from 'next/link';
import { SupportChatWidget } from '../../components/support-chat-widget';
import { useSession, signOut } from 'next-auth/react';
import type { User } from 'next-auth';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession({ required: true, onUnauthenticated() { router.push('/login') } });
  const router = useRouter();

  useEffect(() => {
    // This layout now ONLY handles the onboarding redirect for regular users.
    // Admin/Super Admin redirects are handled by the AuthLayout for immediate routing.
    if (status === 'authenticated' && session.user) {
        if (session.user.role === 'USER' && !session.user.onboardingComplete) {
            router.push('/dashboard/onboarding');
        }
    }
  }, [session, status, router]);
  
  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };
  
  // Show a loader while session is loading, or if the user is an admin who shouldn't see this layout.
  if (status === 'loading' || !session?.user || (session.user.role !== 'USER')) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <LoadingSpinner />
        </div>
    )
  }
  
  const user = session.user;
  
  return (
        <SidebarProvider>
          <div className="flex min-h-screen w-full">
              <Sidebar>
                <SidebarHeader className="p-4">
                  <Logo inSidebar={true} />
                </SidebarHeader>
                <SidebarContent>
                  <DashboardNav />
                </SidebarContent>
                <SidebarFooter>
                  <div className="flex items-center gap-3 p-4">
                    <Avatar className="h-9 w-9">
                      <AvatarImage
                        src={user.image || ''}
                        alt="User Avatar"
                      />
                      <AvatarFallback>
                        {user.email?.[0].toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-semibold text-sm truncate">
                        {user.name || 'User'}
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
                    {/* Potentially add breadcrumbs or page titles here */}
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
                            {user.email?.[0].toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">{user.name || 'User'}</p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/settings">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Settings</span>
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
              {session.user && <SupportChatWidget user={session.user as User} />}
            </SidebarInset>
          </div>
        </SidebarProvider>
    );
}

'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { ArrowLeft, ChevronRight, LogOut, Settings } from 'lucide-react';

import { AdminNav } from '@/components/admin-nav';
import { Logo } from '@/components/logo';
import { ThemeSwitcher } from '@/components/theme-switcher';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type ShellUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  onboardingComplete: boolean;
  status: string;
};

export default function KanriShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: ShellUser;
}) {
  const navType = user.role === 'SUPER_ADMIN' ? 'superAdmin' : 'admin';

  const initials = (user.name ?? user.email ?? 'A')
    .split(' ')
    .map((s) => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex min-h-screen bg-surface-page">
      {/* ── Fixed sidebar ─────────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-[192px] flex-col border-r border-border-default bg-surface-sidebar">

        <div className="flex h-[52px] shrink-0 items-center border-b border-border-default px-4">
          <Logo inSidebar />
        </div>

        <div className="flex-1 overflow-y-auto">
          <AdminNav type={navType} />
        </div>

        <div className="shrink-0 border-t border-border-default p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md px-2 py-2',
                  'transition-colors duration-150',
                  'hover:bg-surface-hover',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus',
                )}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-text-on-brand ring-2 ring-brand/20">
                  {initials}
                </div>
                <div className="flex min-w-0 flex-col text-left">
                  <span className="truncate text-xs font-semibold leading-tight text-text-primary">
                    {user.name || 'Admin'}
                  </span>
                  <span className="truncate text-[10px] leading-tight text-text-muted">
                    {user.email}
                  </span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" side="top" sideOffset={8}>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium">{user.name || 'Admin'}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/kanri/settings">
                  <Settings className="mr-2 h-4 w-4" />Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="mr-2 h-4 w-4" />Back to App
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col pl-[192px]">
        <header className={cn(
          'sticky top-0 z-30 flex h-[52px] items-center justify-between',
          'border-b border-border-default bg-surface-topbar/90 backdrop-blur-md',
          'px-8',
        )}>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-text-muted">Platform</span>
            <ChevronRight className="h-3.5 w-3.5 text-text-muted" />
            <span className="font-semibold text-text-primary">Admin</span>
            <span className={cn(
              'ml-1 rounded border border-brand/25 bg-brand-subtle px-1.5 py-0.5',
              'text-[10px] font-bold uppercase tracking-widest text-text-brand',
            )}>
              Panel
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full',
                  'bg-brand text-[11px] font-bold text-text-on-brand',
                  'ring-2 ring-brand/20 transition-colors duration-150',
                  'hover:ring-brand/40 focus-visible:outline-none',
                )}>
                  {initials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" sideOffset={8}>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium">{user.name || 'Admin'}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/kanri/settings">
                    <Settings className="mr-2 h-4 w-4" />Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">
                    <ArrowLeft className="mr-2 h-4 w-4" />Back to App
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 px-8 py-8">{children}</main>
      </div>
    </div>
  );
}

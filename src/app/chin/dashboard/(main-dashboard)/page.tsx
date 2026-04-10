import {
  Users, BarChart3, Settings, ShieldCheck,
  ArrowRight, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { SupportStatusSwitch } from '@/components/admin/support-status-switch';
import { getDashboardStats } from '@/lib/admin-actions';
import { StatCard } from '@/components/ui/stat-card';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/* ─── Delta type helper ─────────────────────────────────────────── */
type DeltaType = 'positive' | 'negative' | 'neutral';
function getDeltaType(delta: string): DeltaType {
  if (delta.startsWith('-')) return 'negative';
  const num = parseFloat(delta.replace(/[^0-9.-]/g, ''));
  if (num > 0) return 'positive';
  return 'neutral';
}

/* ─── Loading skeleton ──────────────────────────────────────────── */
function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <div className="h-6 w-56 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-80 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[128px] animate-pulse rounded-card border border-border bg-card shadow-sm"
          />
        ))}
      </div>
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
      </div>
    </div>
  );
}

/* ─── Types ─────────────────────────────────────────────────────── */
type DashboardStats = {
  totalUsers:          { value: string; change: string };
  revenue:             { value: string; change: string };
  activeSubscriptions: { value: string; change: string };
  apiStatus:           { value: string; change: string };
};

/* ─── Quick action link ─────────────────────────────────────────── */
function ActionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex h-10 items-center justify-between rounded-md border border-border px-4',
        'bg-transparent text-[13px] font-medium text-foreground/75',
        'transition-all duration-150 ease-in-out',
        'hover:border-primary/30 hover:bg-primary/5 hover:text-primary',
        'dark:hover:border-primary/25 dark:hover:bg-primary/10 dark:hover:text-primary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <span>{children}</span>
      <ArrowRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100" />
    </Link>
  );
}

/* ─── Data component ────────────────────────────────────────────── */
async function DashboardStats() {
  const stats = (await getDashboardStats()) as DashboardStats;

  const cards = [
    {
      label: 'Total Users',
      value: stats.totalUsers.value,
      delta: stats.totalUsers.change,
      icon:  Users,
    },
    {
      label: 'Revenue',
      value: stats.revenue.value,
      delta: stats.revenue.change,
      icon:  BarChart3,
    },
    {
      label: 'Active Subscriptions',
      value: stats.activeSubscriptions.value,
      delta: stats.activeSubscriptions.change,
      icon:  ShieldCheck,
    },
    {
      label: 'API Status',
      value: stats.apiStatus.value,
      delta: stats.apiStatus.change,
      icon:  Settings,
    },
  ];

  return (
    <div className="space-y-6">

      {/* ── Page heading ──────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Super Admin Dashboard
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Welcome to the main control panel for the entire platform.
        </p>
      </div>

      {/* ── Stat cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            delta={card.delta}
            deltaType={getDeltaType(card.delta)}
            icon={card.icon}
          />
        ))}
      </div>

      {/* ── Lower row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Quick Actions — 2 cols */}
        <div className={cn(
          'flex flex-col rounded-card border border-border bg-card p-5 lg:col-span-2',
          'shadow-[0_1px_3px_rgb(0_0_0/0.06)] dark:shadow-none',
        )}>
          <p className="text-sm font-semibold text-foreground">Quick Actions</p>
          <p className="mb-4 mt-0.5 text-[12px] text-muted-foreground">
            Jump directly to key management areas.
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <ActionLink href="/chin/dashboard/users">Manage Users</ActionLink>
            <ActionLink href="/chin/dashboard/plans">Manage Plans</ActionLink>
            <ActionLink href="/chin/dashboard/support">View Support Tickets</ActionLink>
            <ActionLink href="/chin/dashboard/settings">Platform Settings</ActionLink>
          </div>
        </div>

        {/* Support Status — 1 col */}
        <div className="lg:col-span-1">
          <SupportStatusSwitch />
        </div>

      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */
export default function SuperAdminDashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardStats />
    </Suspense>
  );
}

import { Users, BarChart3, Settings, ShieldCheck, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { SupportStatusSwitch } from '@/components/admin/support-status-switch';
import { getDashboardStats } from '@/lib/admin-actions';
import { StatCard } from '@/components/ui/stat-card';

export const dynamic = 'force-dynamic';

/* ─── Loading skeleton ──────────────────────────────────────── */
function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-7 w-64 animate-pulse rounded-md bg-muted" />
        <div className="mt-1.5 h-4 w-80 animate-pulse rounded-md bg-muted" />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[110px] animate-pulse rounded-card border border-border bg-card" />
        ))}
      </div>

      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    </div>
  );
}

/* ─── Types ─────────────────────────────────────────────────── */
type DashboardStats = {
  totalUsers:          { value: string; change: string };
  revenue:             { value: string; change: string };
  activeSubscriptions: { value: string; change: string };
  apiStatus:           { value: string; change: string };
};

/* ─── Data component ────────────────────────────────────────── */
async function DashboardStats() {
  const stats = (await getDashboardStats()) as DashboardStats;

  const cards = [
    {
      label:  'Users',
      value:  stats.totalUsers.value,
      delta:  stats.totalUsers.change,
      icon:   Users,
    },
    {
      label:  'Revenue',
      value:  stats.revenue.value,
      delta:  stats.revenue.change,
      icon:   BarChart3,
    },
    {
      label:  'Active Subscriptions',
      value:  stats.activeSubscriptions.value,
      delta:  stats.activeSubscriptions.change,
      icon:   ShieldCheck,
    },
    {
      label:  'API Status',
      value:  stats.apiStatus.value,
      delta:  stats.apiStatus.change,
      icon:   Settings,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Super Admin Dashboard</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Welcome to the main control panel for the entire platform.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            delta={card.delta}
            deltaType="neutral"
            icon={card.icon}
          />
        ))}
      </div>

      {/* Actions + Support */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Quick Actions — spans 2 cols */}
        <div className="flex h-full flex-col rounded-card border border-border bg-card p-5 lg:col-span-2">
          <p className="text-sm font-semibold">Quick Actions</p>
          <p className="mb-4 mt-0.5 text-xs text-muted-foreground">
            Jump directly to key management areas.
          </p>
          <div className="grid flex-1 grid-cols-2 gap-3">
            <ActionButtonLink href="/chin/dashboard/users">Manage Users</ActionButtonLink>
            <ActionButtonLink href="/chin/dashboard/plans">Manage Plans</ActionButtonLink>
            <ActionButtonLink href="/chin/dashboard/support">View Support Tickets</ActionButtonLink>
            <ActionButtonLink href="/chin/dashboard/settings">Platform Settings</ActionButtonLink>
          </div>
        </div>

        {/* Support Status — 1 col */}
        <div className="h-full lg:col-span-1">
          <SupportStatusSwitch />
        </div>
      </div>
    </div>
  );
}

/* Renders ActionButton's visual style as a Next.js Link */
function ActionButtonLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={[
        'flex h-10 w-full items-center justify-center rounded-btn border border-border',
        'bg-transparent text-sm font-medium text-foreground',
        'transition-all duration-150 ease-in-out',
        'hover:border-brand hover:bg-brand hover:text-white',
        'active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      ].join(' ')}
    >
      {children}
    </Link>
  );
}

/* ─── Page ──────────────────────────────────────────────────── */
export default function SuperAdminDashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardStats />
    </Suspense>
  );
}

'use client';

import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Settings,
  Users,
  ShieldCheck,
  BarChart2,
  MessageSquare,
  KeyRound,
  BookMarked,
  Package,
  TicketPercent,
  Database,
  Clock,
  Mail,
  ToggleRight,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type NavLink = { href: string; icon: LucideIcon; label: string };
type NavGroup = { label: string; links: NavLink[] };

// ── Super Admin groups ────────────────────────────────────────────
const superAdminGroups: NavGroup[] = [
  {
    label: 'Overview',
    links: [
      { href: '/chin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Management',
    links: [
      { href: '/chin/dashboard/users',         icon: Users,        label: 'Users'          },
      { href: '/chin/dashboard/subscriptions', icon: ShieldCheck,  label: 'Subscriptions'  },
      { href: '/chin/dashboard/plans',         icon: Package,      label: 'Plans'          },
      { href: '/chin/dashboard/features',      icon: ToggleRight,  label: 'Features'       },
      { href: '/chin/dashboard/promotions',    icon: TicketPercent,label: 'Promotions'     },
    ],
  },
  {
    label: 'Insights',
    links: [
      { href: '/chin/dashboard/analytics', icon: BarChart2,    label: 'Analytics'       },
      { href: '/chin/dashboard/support',   icon: MessageSquare,label: 'Support Tickets' },
    ],
  },
  {
    label: 'System',
    links: [
      { href: '/chin/dashboard/api-integrations', icon: KeyRound,    label: 'API Integrations' },
      { href: '/chin/dashboard/email-templates',  icon: Mail,        label: 'Email Templates'  },
      { href: '/chin/dashboard/cron-jobs',        icon: Clock,       label: 'Cron Jobs'        },
      { href: '/chin/dashboard/database',         icon: Database,    label: 'Database'         },
      { href: '/chin/dashboard/api-docs',         icon: BookMarked,  label: 'API Docs'         },
      { href: '/chin/dashboard/settings',         icon: Settings,    label: 'Settings'         },
    ],
  },
];

// ── Admin groups ──────────────────────────────────────────────────
const adminGroups: NavGroup[] = [
  {
    label: 'Overview',
    links: [
      { href: '/kanri/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Support',
    links: [
      { href: '/kanri/support',        icon: MessageSquare, label: 'Support Tickets' },
      { href: '/kanri/users',          icon: Users,         label: 'Users'           },
      { href: '/kanri/subscriptions',  icon: ShieldCheck,   label: 'Subscriptions'  },
    ],
  },
  {
    label: 'Config',
    links: [
      { href: '/kanri/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

// ── Exact-match roots (don't use startsWith) ──────────────────────
const EXACT_ROOTS = new Set(['/kanri/dashboard', '/chin/dashboard']);

function NavItem({ item }: { item: NavLink }) {
  const pathname = usePathname();
  const isActive = EXACT_ROOTS.has(item.href)
    ? pathname === item.href
    : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      className={cn(
        'group flex h-8 items-center gap-2.5 rounded-md px-2.5',
        'text-[13px] font-medium transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus',
        isActive
          ? 'bg-surface-active text-text-brand border-l-2 border-brand pl-[9px]'
          : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
      )}
    >
      <item.icon
        className={cn(
          'h-[14px] w-[14px] shrink-0 transition-colors duration-150',
          isActive
            ? 'text-text-brand'
            : 'text-text-muted group-hover:text-text-secondary',
        )}
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function AdminNav({ type }: { type: 'admin' | 'superAdmin' }) {
  const groups = type === 'superAdmin' ? superAdminGroups : adminGroups;

  return (
    <nav className="flex flex-col gap-5 px-3 py-4">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-0.5">
          {/* Section label */}
          <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-widest text-text-muted select-none">
            {group.label}
          </p>

          {/* Links */}
          {group.links.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
        </div>
      ))}
    </nav>
  );
}

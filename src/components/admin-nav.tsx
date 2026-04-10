'use client';

import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Settings,
  Users,
  ShieldCheck,
  BarChart,
  MessageSquare,
  KeyRound,
  BookMarked,
  Package,
  TicketPercent,
  Database,
  Clock,
  Mail,
  ToggleRight,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const superAdminLinks = [
  { href: '/chin/dashboard',                      icon: LayoutDashboard, label: 'Dashboard'        },
  { href: '/chin/dashboard/users',                icon: Users,           label: 'Users'             },
  { href: '/chin/dashboard/subscriptions',        icon: ShieldCheck,     label: 'Subscriptions'     },
  { href: '/chin/dashboard/plans',                icon: Package,         label: 'Plans'             },
  { href: '/chin/dashboard/features',             icon: ToggleRight,     label: 'Features'          },
  { href: '/chin/dashboard/promotions',           icon: TicketPercent,   label: 'Promotions'        },
  { href: '/chin/dashboard/analytics',            icon: BarChart,        label: 'Analytics'         },
  { href: '/chin/dashboard/support',              icon: MessageSquare,   label: 'Support Tickets'   },
  { href: '/chin/dashboard/api-integrations',     icon: KeyRound,        label: 'API Integrations'  },
  { href: '/chin/dashboard/email-templates',      icon: Mail,            label: 'Email Templates'   },
  { href: '/chin/dashboard/cron-jobs',            icon: Clock,           label: 'Cron Jobs'         },
  { href: '/chin/dashboard/database',             icon: Database,        label: 'Database'          },
  { href: '/chin/dashboard/api-docs',             icon: BookMarked,      label: 'API Docs'          },
  { href: '/chin/dashboard/settings',             icon: Settings,        label: 'Settings'          },
];

const adminLinks = [
  { href: '/kanri/dashboard',     icon: LayoutDashboard, label: 'Dashboard'       },
  { href: '/kanri/support',       icon: MessageSquare,   label: 'Support Tickets' },
  { href: '/kanri/users',         icon: Users,           label: 'Users'           },
  { href: '/kanri/subscriptions', icon: ShieldCheck,     label: 'Subscriptions'   },
  { href: '/kanri/settings',      icon: Settings,        label: 'Settings'        },
];

export function AdminNav({ type }: { type: 'admin' | 'superAdmin' }) {
  const pathname = usePathname();
  const links = type === 'superAdmin' ? superAdminLinks : adminLinks;

  return (
    <nav className="flex flex-col gap-0.5 px-3 py-2">
      {links.map((item) => {
        const isExact = item.href === '/kanri/dashboard' || item.href === '/chin/dashboard';
        const isActive = isExact ? pathname === item.href : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              // Base nav item
              'group flex h-9 items-center gap-2.5 rounded-btn px-3 text-sm font-medium',
              'text-sidebar-foreground/70 transition-all duration-[150ms] ease-[ease]',
              'hover:bg-black/5 hover:text-sidebar-foreground dark:hover:bg-white/5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              // Active state
              isActive && [
                'bg-black/[0.08] dark:bg-white/[0.08] text-sidebar-foreground',
                'border-l-2 border-sidebar-primary pl-[10px]',
              ],
            )}
          >
            <item.icon
              className={cn(
                'h-4 w-4 shrink-0 transition-colors duration-[150ms]',
                isActive
                  ? 'text-sidebar-primary'
                  : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70',
              )}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}



"use client";

import { usePathname } from "next/navigation";
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
    Mail
} from "lucide-react";
import Link from "next/link";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "./ui/sidebar";

const superAdminLinks = [
    { href: '/chin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/chin/dashboard/users', icon: Users, label: 'Users' },
    { href: '/chin/dashboard/subscriptions', icon: ShieldCheck, label: 'Subscriptions' },
    { href: '/chin/dashboard/plans', icon: Package, label: 'Plans' },
    { href: '/chin/dashboard/promotions', icon: TicketPercent, label: 'Promotions' },
    { href: '/chin/dashboard/analytics', icon: BarChart, label: 'Analytics' },
    { href: '/chin/dashboard/support', icon: MessageSquare, label: 'Support Tickets' },
    { href: '/chin/dashboard/api-integrations', icon: KeyRound, label: 'API Integrations' },
    { href: '/chin/dashboard/email-templates', icon: Mail, label: 'Email Templates' },
    { href: '/chin/dashboard/cron-jobs', icon: Clock, label: 'Cron Jobs' },
    { href: '/chin/dashboard/database', icon: Database, label: 'Database' },
    { href: '/chin/dashboard/api-docs', icon: BookMarked, label: 'API Docs' },
    { href: '/chin/dashboard/settings', icon: Settings, label: 'Settings' },
];

const adminLinks = [
    { href: '/kanri/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/kanri/support', icon: MessageSquare, label: 'Support Tickets' },
    { href: '/kanri/users', icon: Users, label: 'Users' },
    { href: '/kanri/subscriptions', icon: ShieldCheck, label: 'Subscriptions' },
    { href: '/kanri/settings', icon: Settings, label: 'Settings' },
];


export function AdminNav({ type }: { type: 'admin' | 'superAdmin' }) {
    const pathname = usePathname();
    const links = type === 'superAdmin' ? superAdminLinks : adminLinks;
    
    return (
        <div className="flex flex-col gap-2 px-4 py-2">
            <SidebarMenu className="space-y-1">
                {links.map((item) => {
                    const isActive = (item.href === '/kanri/dashboard' || item.href === '/chin/dashboard') 
                        ? pathname === item.href 
                        : pathname.startsWith(item.href);

                    return (
                        <SidebarMenuItem key={item.href}>
                            <SidebarMenuButton
                                asChild
                                isActive={isActive}
                                tooltip={item.label}
                                variant="ghost"
                                className="justify-start gap-3"
                            >
                                <Link href={item.href}>
                                    <item.icon className="w-5 h-5 text-sidebar-primary group-data-[active=true]:text-sidebar-primary-foreground" />
                                    <span className="text-base font-medium group-data-[collapsible=icon]:hidden">{item.label}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )
                })}
            </SidebarMenu>
        </div>
    );
}

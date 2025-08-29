
'use client';

import { cn } from "../lib/utils";
import { useAdminSettings } from "../contexts/admin-settings-context";
import { Clapperboard } from "lucide-react";
import Image from "next/image";

interface LogoProps {
  className?: string;
  size?: 'default' | 'large';
  inSidebar?: boolean;
}

export function Logo({ className, size = 'default', inSidebar = false }: LogoProps) {
  const { appName, logoUrl } = useAdminSettings();

  return (
    <div 
        className={cn(
            "flex items-center gap-3 group",
             className
        )}
    >
      <div 
        className={cn(
            "p-2 bg-primary/20 rounded-lg flex items-center justify-center",
            size === 'default' && 'w-10 h-10',
            size === 'large' && 'w-12 h-12'
        )}
      >
        {logoUrl ? (
             <Image src={logoUrl} alt={`${appName} Logo`} width={size === 'large' ? 32 : 28} height={size === 'large' ? 32 : 28} className="object-contain" />
        ) : (
            <Clapperboard 
                className={cn(
                    "text-primary",
                    size === 'default' && 'w-6 h-6',
                    size === 'large' && 'w-7 h-7'
                )} 
            />
        )}
      </div>
      <h1 
        className={cn(
            "font-semibold transition-all group-data-[collapsible=icon]:hidden",
            inSidebar ? 'text-sidebar-foreground font-bold' : 'text-foreground font-headline',
            size === 'default' && 'text-2xl',
            size === 'large' && 'text-3xl font-semibold'
        )}
      >
        {appName}
      </h1>
    </div>
  );
}

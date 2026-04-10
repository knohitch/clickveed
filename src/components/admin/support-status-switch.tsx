'use client';

import { Switch } from '@/components/ui/switch';
import { useAdminSettings } from '@/contexts/admin-settings-context';
import { cn } from '@/lib/utils';

export function SupportStatusSwitch() {
  const { isSupportOnline, setIsSupportOnline, loading } = useAdminSettings();

  return (
    <div className={cn(
      'flex h-full flex-col rounded-card border border-border bg-card p-5',
      'shadow-[0_1px_3px_rgb(0_0_0/0.06)] dark:shadow-none',
    )}>
      {/* Header */}
      <p className="text-sm font-semibold text-foreground">Support Status</p>
      <p className="mt-0.5 text-[12px] text-muted-foreground">
        Set the availability of the support team.
      </p>

      {/* Status row */}
      <div className={cn(
        'mt-4 flex items-center justify-between gap-4 rounded-md border p-4',
        isSupportOnline
          ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-500/[0.07]'
          : 'border-border bg-muted/40 dark:bg-white/[0.03]',
      )}>
        <div className="flex items-center gap-3 min-w-0">
          {/* Status dot */}
          <span className={cn(
            'relative flex h-2.5 w-2.5 shrink-0',
          )}>
            <span className={cn(
              'absolute inline-flex h-full w-full rounded-full opacity-75',
              isSupportOnline
                ? 'animate-ping bg-emerald-400'
                : 'bg-muted-foreground/40',
            )} />
            <span className={cn(
              'relative inline-flex h-2.5 w-2.5 rounded-full',
              isSupportOnline ? 'bg-emerald-500' : 'bg-muted-foreground/50',
            )} />
          </span>

          <div className="min-w-0">
            <p className={cn(
              'text-[13px] font-semibold leading-tight',
              isSupportOnline ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground/70',
            )}>
              Team is {isSupportOnline ? 'Online' : 'Away'}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
              Toggling affects the support widget
            </p>
          </div>
        </div>

        <Switch
          id="support-status-switch"
          checked={isSupportOnline}
          onCheckedChange={setIsSupportOnline}
          disabled={loading}
          aria-label="Toggle support availability"
          className="shrink-0"
        />
      </div>
    </div>
  );
}

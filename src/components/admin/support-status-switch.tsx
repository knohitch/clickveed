'use client';

import { Switch } from '@/components/ui/switch';
import { useAdminSettings } from '@/contexts/admin-settings-context';
import { cn } from '@/lib/utils';

export function SupportStatusSwitch() {
  const { isSupportOnline, setIsSupportOnline, loading } = useAdminSettings();

  return (
    <div className={cn(
      'flex h-full flex-col rounded-card border border-border-default bg-surface-card p-5',
      'shadow-[0_1px_4px_rgb(15_30_80/0.07),0_0_0_1px_rgb(15_30_80/0.03)] dark:shadow-none',
    )}>
      {/* Header */}
      <p className="text-sm font-semibold text-text-primary">Support Status</p>
      <p className="mt-0.5 text-[12px] text-text-secondary">
        Set the availability of the support team.
      </p>

      {/* Status row */}
      <div className={cn(
        'mt-4 flex items-center justify-between gap-4 rounded-md border p-4',
        isSupportOnline
          ? 'border-[var(--status-success)]/20 bg-[var(--status-success-bg)]'
          : 'border-border-default bg-[var(--status-neutral-bg)]',
      )}>
        <div className="flex items-center gap-3 min-w-0">
          {/* Status dot */}
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className={cn(
              'absolute inline-flex h-full w-full rounded-full opacity-75',
              isSupportOnline
                ? 'animate-ping bg-[var(--status-success)]'
                : 'bg-text-muted',
            )} />
            <span className={cn(
              'relative inline-flex h-2.5 w-2.5 rounded-full',
              isSupportOnline ? 'bg-[var(--status-success)]' : 'bg-text-muted',
            )} />
          </span>

          <div className="min-w-0">
            <p className={cn(
              'text-[13px] font-semibold leading-tight',
              isSupportOnline
                ? 'text-[var(--status-success-text)]'
                : 'text-text-secondary',
            )}>
              Team is {isSupportOnline ? 'Online' : 'Away'}
            </p>
            <p className="mt-0.5 text-[11px] text-text-muted truncate">
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

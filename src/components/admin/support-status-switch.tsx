'use client';

import { Power } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useAdminSettings } from '@/contexts/admin-settings-context';
import { cn } from '@/lib/utils';

export function SupportStatusSwitch() {
  const { isSupportOnline, setIsSupportOnline, loading } = useAdminSettings();

  return (
    <div className="flex h-full flex-col rounded-card border border-border bg-card p-5">
      <p className="text-sm font-semibold">Support Status</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Set the availability of the support team.
      </p>

      <div className="mt-4 flex items-center justify-between rounded-card border border-border bg-background p-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium">
            <Power
              className={cn(
                'h-4 w-4 transition-colors duration-[150ms]',
                isSupportOnline ? 'text-green-500' : 'text-red-500',
              )}
            />
            Team is currently{' '}
            <span className={isSupportOnline ? 'text-green-500' : 'text-red-500'}>
              {isSupportOnline ? 'Online' : 'Away'}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Toggling this will affect the user-facing support widget.
          </p>
        </div>

        <Switch
          id="support-status-switch"
          checked={isSupportOnline}
          onCheckedChange={setIsSupportOnline}
          disabled={loading}
          aria-label="Toggle support availability"
        />
      </div>
    </div>
  );
}

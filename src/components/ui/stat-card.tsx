import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type DeltaType = 'positive' | 'negative' | 'neutral';

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaType?: DeltaType;
  icon?: LucideIcon;
  className?: string;
}

const deltaBadge: Record<DeltaType, string> = {
  positive: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] ring-1 ring-[var(--status-success)]/20',
  negative: 'bg-[var(--status-error-bg)] text-[var(--status-error-text)] ring-1 ring-[var(--status-error)]/20',
  neutral:  'bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)] ring-1 ring-border-default',
};

export function StatCard({
  label,
  value,
  delta,
  deltaType = 'neutral',
  icon: Icon,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        // Base structure
        'group relative flex flex-col justify-between overflow-hidden',
        'rounded-card border border-border-default bg-surface-card p-5',
        // Light: layered shadow
        'shadow-[0_1px_4px_rgb(15_30_80/0.07),0_0_0_1px_rgb(15_30_80/0.03)]',
        'hover:shadow-[0_6px_16px_rgb(15_30_80/0.09),0_1px_4px_rgb(15_30_80/0.05)] hover:-translate-y-px',
        // Dark: brighter border on hover
        'dark:shadow-none dark:hover:border-border-strong',
        'transition-[transform,box-shadow,border-color] duration-200',
        className,
      )}
    >
      {/* Subtle top gradient accent on hover */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/30 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

      {/* Header row: label + icon */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
          {label}
        </p>
        {Icon && (
          <Icon className="h-4 w-4 shrink-0 text-text-muted/60 transition-colors duration-150 group-hover:text-text-brand" />
        )}
      </div>

      {/* Value */}
      <div className="mt-3">
        <p className="text-[28px] font-semibold leading-none tracking-tight text-text-primary">
          {value}
        </p>
      </div>

      {/* Delta badge */}
      {delta && (
        <div className="mt-3">
          <span className={cn(
            'inline-flex items-center rounded-[4px] px-1.5 py-0.5',
            'text-[11px] font-medium leading-none',
            deltaBadge[deltaType],
          )}>
            {delta}
          </span>
        </div>
      )}
    </div>
  );
}

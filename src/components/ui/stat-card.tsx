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
  positive: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20',
  negative: 'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20',
  neutral:  'bg-muted text-muted-foreground ring-1 ring-border dark:bg-white/5 dark:text-muted-foreground dark:ring-white/10',
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
        'rounded-card border border-border bg-card p-5',
        // Light mode: real shadow for depth
        'shadow-[0_1px_3px_rgb(0_0_0/0.06),0_1px_2px_-1px_rgb(0_0_0/0.04)]',
        'hover:shadow-[0_4px_12px_rgb(0_0_0/0.08),0_1px_3px_rgb(0_0_0/0.06)]',
        // Dark mode: brighter border on hover instead of shadow
        'dark:shadow-none dark:hover:border-white/[0.14]',
        'transition-all duration-200 ease-in-out',
        className,
      )}
    >
      {/* Subtle top gradient accent line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

      {/* Header row: label + icon */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          {label}
        </p>
        {Icon && (
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors duration-150 group-hover:text-primary/60" />
        )}
      </div>

      {/* Value */}
      <div className="mt-3">
        <p className="text-[28px] font-semibold leading-none tracking-tight text-foreground">
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

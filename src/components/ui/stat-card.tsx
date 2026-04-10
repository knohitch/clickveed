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

const deltaStyles: Record<DeltaType, string> = {
  positive: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  negative: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  neutral:  'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400',
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
        'relative flex flex-col gap-3 rounded-card border border-border bg-card p-5',
        'transition-all duration-[150ms] ease-[ease]',
        className,
      )}
    >
      {/* Icon — top right */}
      {Icon && (
        <Icon className="absolute right-4 top-4 h-[18px] w-[18px] text-muted-foreground" />
      )}

      {/* Label */}
      <p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>

      {/* Value */}
      <p className="text-stat leading-none">{value}</p>

      {/* Delta badge */}
      {delta && (
        <span
          className={cn(
            'inline-flex w-fit items-center rounded-badge px-1.5 py-0.5 text-xs font-medium',
            deltaStyles[deltaType],
          )}
        >
          {delta}
        </span>
      )}
    </div>
  );
}

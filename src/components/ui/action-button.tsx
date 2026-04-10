import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'primary' | 'ghost';

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  default: cn(
    'border border-border-default bg-transparent text-text-primary',
    'hover:border-brand hover:bg-brand-subtle hover:text-text-brand',
  ),
  primary: cn(
    'border border-transparent bg-brand text-text-on-brand',
    'hover:bg-brand-hover',
  ),
  ghost: cn(
    'border border-transparent bg-transparent text-text-secondary',
    'hover:bg-surface-hover hover:text-text-primary',
  ),
};

export function ActionButton({
  className,
  variant = 'default',
  disabled,
  children,
  ...props
}: ActionButtonProps) {
  return (
    <button
      disabled={disabled}
      className={cn(
        'flex h-9 items-center justify-center gap-2 rounded-btn px-4',
        'text-sm font-medium',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-1',
        'active:scale-[0.98]',
        disabled
          ? 'cursor-not-allowed opacity-40 pointer-events-none'
          : variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

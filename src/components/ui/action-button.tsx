import * as React from 'react';
import { cn } from '@/lib/utils';

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  children: React.ReactNode;
}

export function ActionButton({ className, children, ...props }: ActionButtonProps) {
  return (
    <button
      className={cn(
        'flex h-10 w-full items-center justify-center rounded-btn border border-border',
        'bg-transparent text-sm font-medium text-foreground',
        'transition-all duration-[150ms] ease-[ease]',
        'hover:border-brand hover:bg-brand hover:text-white',
        'active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

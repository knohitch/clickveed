'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
  className?: string;
}

export function Toggle({
  checked,
  onCheckedChange,
  disabled = false,
  label,
  id,
  className,
}: ToggleProps) {
  const generatedId = React.useId();
  const toggleId = id ?? generatedId;

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <button
        id={toggleId}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => !disabled && onCheckedChange(!checked)}
        className={cn(
          // Pill track: 40×22px
          'relative inline-flex h-[22px] w-[40px] shrink-0 cursor-pointer rounded-toggle',
          'border-2 border-transparent outline-none',
          'transition-colors duration-150',
          'focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card',
          checked ? 'bg-brand' : 'bg-surface-hover dark:bg-[var(--border-strong)]',
          disabled && 'cursor-not-allowed opacity-40',
        )}
      >
        {/* Thumb: 18×18px */}
        <span
          className={cn(
            'pointer-events-none block h-[18px] w-[18px] rounded-full bg-white shadow-sm',
            'transition-transform duration-150',
            checked ? 'translate-x-[18px]' : 'translate-x-0',
          )}
        />
      </button>
      {label && (
        <label
          htmlFor={toggleId}
          className={cn(
            'cursor-pointer select-none text-[13px] font-medium text-text-secondary',
            disabled && 'cursor-not-allowed opacity-40',
          )}
        >
          {label}
        </label>
      )}
    </div>
  );
}

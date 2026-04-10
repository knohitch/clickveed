'use client';

import * as React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

const THEMES = [
  { name: 'light', icon: Sun,     label: 'Light mode'  },
  { name: 'dark',  icon: Moon,    label: 'Dark mode'   },
  { name: 'system',icon: Monitor, label: 'System theme' },
] as const;

export function ThemeSwitcher() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => { setMounted(true); }, []);

  // Hydration placeholder — same dimensions, invisible
  if (!mounted) {
    return (
      <div className="flex items-center gap-0.5 rounded-md border border-border bg-secondary p-1 h-8 w-[88px]" />
    );
  }

  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border bg-secondary p-1">
      {THEMES.map(({ name, icon: Icon, label }) => {
        const isActive = theme === name;
        return (
          <button
            key={name}
            onClick={() => setTheme(name)}
            aria-label={label}
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-[4px]',
              'text-muted-foreground transition-all duration-150 ease-in-out',
              'hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive && 'bg-background dark:bg-white/15 text-foreground shadow-sm',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}

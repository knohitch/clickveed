'use client';

import * as React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

const THEMES = [
  { name: 'light',  icon: Sun,     label: 'Light'  },
  { name: 'dark',   icon: Moon,    label: 'Dark'   },
  { name: 'system', icon: Monitor, label: 'System' },
] as const;

export function ThemeSwitcher() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  if (!mounted) return <div className="h-8 w-[88px] rounded-lg border border-border bg-secondary" />;

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-secondary p-1">
      {THEMES.map(({ name, icon: Icon, label }) => (
        <button
          key={name}
          onClick={() => setTheme(name)}
          aria-label={label}
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-md',
            'text-muted-foreground transition-all duration-150 ease-in-out',
            'hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            theme === name && 'bg-card text-foreground shadow-sm dark:bg-white/10',
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}

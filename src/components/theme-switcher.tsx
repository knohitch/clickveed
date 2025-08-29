
"use client"

import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"

export function ThemeSwitcher() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // On the server or during hydration, render a placeholder or nothing to avoid mismatch
    return (
        <div className="relative flex items-center rounded-full bg-secondary p-1 h-10 w-28" />
    );
  }

  const themes = [
    { name: "light", icon: Sun },
    { name: "dark", icon: Moon },
    { name: "system", icon: Monitor },
  ];

  return (
    <div className="relative flex items-center rounded-full bg-secondary p-1">
      <div
        className={cn(
          "absolute h-8 w-8 rounded-full bg-background shadow-md transition-transform duration-300 ease-in-out",
          theme === "light" && "translate-x-0",
          theme === "dark" && "translate-x-full",
          theme === "system" && "translate-x-[200%]"
        )}
      />
      {themes.map((t) => (
        <button
          key={t.name}
          onClick={() => setTheme(t.name)}
          className={cn(
            "relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
            "transition-colors duration-300",
            theme === t.name ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
          aria-label={`Switch to ${t.name} theme`}
        >
          <t.icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  )
}

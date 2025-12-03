
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes/dist/types"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
        
        // Ensure theme is applied properly by forcing a check
        if (typeof window !== 'undefined') {
            // Read theme from localStorage if available
            const savedTheme = localStorage.getItem('theme')
            
            // Apply saved theme or use default
            if (savedTheme) {
                document.documentElement.setAttribute('data-theme', savedTheme)
                document.documentElement.classList.toggle('dark', 
                    savedTheme === 'dark' || 
                    (savedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
                )
            }
        }
    }, [])

    if (!mounted) {
        return <>{children}</>
    }
    
    return <NextThemesProvider 
        storageKey="theme"
        enableSystem={true}
        enableColorScheme={true}
        {...props}
    >{children}</NextThemesProvider>
}

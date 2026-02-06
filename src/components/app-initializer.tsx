
'use client';

import { ThemeProvider } from "./theme-provider";
import { AdminSettingsProvider } from "@/contexts/admin-settings-context";
import { AuthProvider } from "@/contexts/auth-context";
import { useEffect } from "react";

// This component ensures all client-side providers are initialized at the root of the application,
// correctly separating client-side state from server-rendered components.
export default function AppInitializer({ children }: { children: React.ReactNode }) {
    // Add effect to handle system theme changes
    useEffect(() => {
        // Listen for system color scheme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        const handleChange = () => {
            // If theme is set to system, update the class based on system preference
            if (typeof window !== 'undefined') {
                const savedTheme = localStorage.getItem('theme');
                if (savedTheme === 'system') {
                    document.documentElement.classList.toggle('dark', mediaQuery.matches);
                }
            }
        };
        
        mediaQuery.addEventListener('change', handleChange);
        
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={true}
            enableColorScheme={true}
            storageKey="theme"
            forcedTheme={undefined}
            disableTransitionOnChange
        >
            <AdminSettingsProvider>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </AdminSettingsProvider>
        </ThemeProvider>
    );
}

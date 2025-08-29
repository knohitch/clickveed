
'use client';

import { ThemeProvider } from "./theme-provider";
import { AdminSettingsProvider } from "@/contexts/admin-settings-context";
import { AuthProvider } from "@/contexts/auth-context";

// This component ensures all client-side providers are initialized at the root of the application,
// correctly separating client-side state from server-rendered components.
export default function AppInitializer({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
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

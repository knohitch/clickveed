
"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AdminSettings = {
  maintenanceMode: boolean;
  featureFlags: Record<string, boolean>;
  loaded: boolean;
};

const AdminSettingsContext = createContext<AdminSettings | null>(null);

export function AdminSettingsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AdminSettings>({
    maintenanceMode: false,
    featureFlags: {},
    loaded: false,
  });

  // TEMP: Replace with real Postgres-backed endpoint later
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/settings", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setState({
            maintenanceMode: !!data.maintenanceMode,
            featureFlags: data.featureFlags ?? {},
            loaded: true,
          });
        } else {
          setState((s) => ({ ...s, loaded: true }));
        }
      } catch {
        setState((s) => ({ ...s, loaded: true }));
      }
    })();
  }, []);

  const value = useMemo(() => state, [state]);

  return <AdminSettingsContext.Provider value={value}>{children}</AdminSettingsContext.Provider>;
}

export function useAdminSettings() {
  const ctx = useContext(AdminSettingsContext);
  if (!ctx) throw new Error("useAdminSettings must be used within AdminSettingsProvider");
  return ctx;
}

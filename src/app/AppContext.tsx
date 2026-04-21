/**
 * Lightweight tenant + user context.
 * Real wiring goes through Lovable Cloud auth; here we expose a stable mock user
 * so the app is fully navigable without configuring Cloud first.
 */
import { createContext, useContext, type ReactNode } from "react";
import type { Tenant, User } from "@/modules/types";
import { seedTenants, seedUsers } from "@/services/mock/seed";

interface AppContextValue {
  tenant: Tenant;
  user: User;
  users: User[];
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const tenant = seedTenants[0];
  const user = seedUsers.find((u) => u.role === "director")!;
  return <AppContext.Provider value={{ tenant, user, users: seedUsers }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

export const useCurrentTenant = () => useApp().tenant;
export const useCurrentUser = () => useApp().user;
export const useRole = () => useApp().user.role;

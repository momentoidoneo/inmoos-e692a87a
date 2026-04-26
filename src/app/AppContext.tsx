/**
 * Tenant + user context for the app.
 *
 * After auth integration this proxies the AuthContext (real Supabase user + tenant),
 * but exposes the same shape the rest of the app already consumes, so business
 * pages don't need to know whether data comes from Cloud or mock.
 *
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Tenant, User } from "@/modules/types";
import { useAuth } from "./AuthContext";

interface AppContextValue {
  tenant: Tenant;
  user: User;
  users: User[];
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { activeTenant, profile, user: supaUser, role } = useAuth();

  const value = useMemo<AppContextValue | null>(() => {
    if (!activeTenant || !supaUser) return null;

    const tenant: Tenant = {
      id: activeTenant.id,
      name: activeTenant.name,
      slug: activeTenant.slug,
      logoUrl: activeTenant.logo_url ?? undefined,
      primaryColor: activeTenant.primary_color ?? undefined,
    };

    const user: User = {
      id: supaUser.id,
      tenantId: activeTenant.id,
      name: profile?.full_name ?? supaUser.email ?? "Usuario",
      email: profile?.email ?? supaUser.email ?? "",
      role: (role ?? "agente") as User["role"],
      avatarUrl: profile?.avatar_url ?? undefined,
      phone: profile?.phone ?? undefined,
      active: true,
    };

    return { tenant, user, users: [user] };
  }, [activeTenant, supaUser, profile, role]);

  if (!value) return null;
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

export const useCurrentTenant = () => useApp().tenant;
export const useCurrentUser = () => useApp().user;
export const useRole = () => useApp().user.role;

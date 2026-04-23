/**
 * AuthContext — wires Supabase auth + multi-tenant membership.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User as SupaUser } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { httpConfig } from "@/services/http/client";

export type AppRole = "super_admin" | "admin" | "director" | "agente" | "backoffice";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
}

export interface TenantRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
}

interface AuthContextValue {
  session: Session | null;
  user: SupaUser | null;
  profile: Profile | null;
  tenants: TenantRow[];
  activeTenant: TenantRow | null;
  role: AppRole | null;
  loading: boolean;
  tenantsLoaded: boolean;
  tenantsError: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  switchTenant: (tenantId: string) => void;
  refreshTenants: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ACTIVE_TENANT_KEY = "inmoos.activeTenantId";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SupaUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_TENANT_KEY),
  );
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenantsLoaded, setTenantsLoaded] = useState(false);
  const [tenantsError, setTenantsError] = useState<string | null>(null);

  const loadProfile = useCallback(async (uid: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    if (data) setProfile(data as Profile);
  }, []);

  const loadTenants = useCallback(async (uid: string) => {
    setTenantsError(null);
    const { data: memberships, error: mErr } = await supabase
      .from("user_tenants")
      .select("tenant_id, is_default")
      .eq("user_id", uid);

    if (mErr) {
      console.error("[auth] loadTenants memberships error", mErr);
      setTenantsError(mErr.message);
      setTenantsLoaded(true);
      return;
    }

    const tenantIds = (memberships ?? []).map((m) => m.tenant_id);

    let list: TenantRow[] = [];
    if (tenantIds.length > 0) {
      const { data: tenantRows, error: tErr } = await supabase
        .from("tenants")
        .select("*")
        .in("id", tenantIds);
      if (tErr) {
        console.error("[auth] loadTenants tenants error", tErr);
        setTenantsError(tErr.message);
        setTenantsLoaded(true);
        return;
      }
      list = (tenantRows ?? []) as TenantRow[];
    }

    setTenants(list);

    const stored = localStorage.getItem(ACTIVE_TENANT_KEY);
    let nextId: string | null = (stored && list.find((t) => t.id === stored)?.id) || null;
    if (!nextId) {
      const def = (memberships ?? []).find((m) => m.is_default);
      nextId = def?.tenant_id ?? list[0]?.id ?? null;
    }
    if (nextId) {
      setActiveTenantId(nextId);
      localStorage.setItem(ACTIVE_TENANT_KEY, nextId);
      httpConfig.setTenant(nextId);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("tenant_id", nextId);
      setRole((roles?.[0]?.role as AppRole) ?? null);
    } else {
      httpConfig.setTenant(null);
      setRole(null);
    }
    setTenantsLoaded(true);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      httpConfig.setToken(newSession?.access_token ?? null);

      if (newSession?.user) {
        // Reload memberships only on real sign-in, NOT on every TOKEN_REFRESHED
        if (event === "SIGNED_IN") {
          setTimeout(() => {
            loadProfile(newSession.user.id);
            loadTenants(newSession.user.id);
          }, 0);
        }
      } else {
        setProfile(null);
        setTenants([]);
        setTenantsLoaded(false);
        setRole(null);
        httpConfig.setTenant(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      httpConfig.setToken(s?.access_token ?? null);
      if (s?.user) {
        loadProfile(s.user.id);
        loadTenants(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName },
      },
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(ACTIVE_TENANT_KEY);
  }, []);

  const switchTenant = useCallback((tenantId: string) => {
    setActiveTenantId(tenantId);
    localStorage.setItem(ACTIVE_TENANT_KEY, tenantId);
    httpConfig.setTenant(tenantId);
    if (user) {
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("tenant_id", tenantId)
        .then(({ data }) => setRole((data?.[0]?.role as AppRole) ?? null));
    }
  }, [user]);

  const refreshTenants = useCallback(async () => {
    if (user) await loadTenants(user.id);
  }, [user, loadTenants]);

  const activeTenant = useMemo(
    () => tenants.find((t) => t.id === activeTenantId) ?? null,
    [tenants, activeTenantId],
  );

  const value: AuthContextValue = {
    session,
    user,
    profile,
    tenants,
    activeTenant,
    role,
    loading,
    tenantsLoaded,
    tenantsError,
    signIn,
    signUp,
    signOut,
    switchTenant,
    refreshTenants,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

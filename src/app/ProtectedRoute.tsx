/**
 * Guards routes that require an authenticated user.
 * - Not logged in → /login
 * - Logged in but no tenant yet → /onboarding (only once memberships are loaded with no error)
 * - On membership load error → show retry UI instead of redirecting
 */
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, tenants, loading, tenantsLoaded, tenantsError, refreshTenants, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If we couldn't load memberships (network/RLS hiccup), show retry instead of redirecting.
  if (tenantsError) {
    return (
      <div className="min-h-screen grid place-items-center bg-background p-4">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 text-destructive grid place-items-center">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">No pudimos cargar tu cuenta</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Hubo un problema al recuperar tus inmobiliarias. Inténtalo de nuevo.
            </p>
            <p className="text-xs text-muted-foreground mt-2 break-all">{tenantsError}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={() => refreshTenants()}>Reintentar</Button>
            <Button variant="ghost" onClick={() => signOut()}>Cerrar sesión</Button>
          </div>
        </div>
      </div>
    );
  }

  // Wait until memberships have been queried at least once before deciding.
  if (!tenantsLoaded) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (tenants.length === 0 && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

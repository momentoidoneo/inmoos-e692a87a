/**
 * First-time onboarding: user just signed up and has no tenant yet.
 * Creates a tenant, the default membership, and assigns the `admin` role.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Loader2 } from "lucide-react";
import { useAuth } from "@/app/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { loadDemoData } from "@/services/seedLoader.service";

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export default function Onboarding() {
  const { user, refreshTenants, signOut } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [withDemo, setWithDemo] = useState(true);
  const [busy, setBusy] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);

    // Re-check that we actually have an authenticated session before insert.
    // If the access token expired silently, RLS will reject the insert.
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setBusy(false);
      toast({
        title: "Sesión expirada",
        description: "Vuelve a iniciar sesión y prueba de nuevo.",
        variant: "destructive",
      });
      await signOut();
      navigate("/login", { replace: true });
      return;
    }

    const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;

    const { data: tenant, error: tErr } = await supabase
      .from("tenants")
      .insert({ name, slug })
      .select()
      .single();

    if (tErr || !tenant) {
      setBusy(false);
      toast({
        title: "Error creando inmobiliaria",
        description:
          tErr?.message?.includes("row-level security")
            ? "Tu sesión no está autenticada correctamente. Cierra sesión y vuelve a entrar."
            : tErr?.message,
        variant: "destructive",
      });
      return;
    }

    const [{ error: mErr }, { error: rErr }] = await Promise.all([
      supabase.from("user_tenants").insert({ user_id: user.id, tenant_id: tenant.id, is_default: true }),
      supabase.from("user_roles").insert({ user_id: user.id, tenant_id: tenant.id, role: "admin" }),
    ]);

    if (mErr || rErr) {
      setBusy(false);
      toast({
        title: "Error finalizando alta",
        description: mErr?.message ?? rErr?.message,
        variant: "destructive",
      });
      return;
    }

    if (withDemo) {
      try { await loadDemoData(tenant.id, user.id); }
      catch (e) { console.warn("demo data load failed", e); }
    }

    await refreshTenants();
    setBusy(false);
    toast({ title: "Inmobiliaria creada", description: `Bienvenido a ${tenant.name}.` });
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-lg bg-primary text-primary-foreground grid place-items-center mb-2">
            <Building2 className="h-6 w-6" />
          </div>
          <CardTitle>Crea tu inmobiliaria</CardTitle>
          <CardDescription>
            Configura el espacio de trabajo para tu equipo. Podrás invitar a más personas después.
          </CardDescription>
          {user?.email && (
            <p className="text-xs text-muted-foreground mt-2">
              Sesión: <span className="font-medium">{user.email}</span>
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="mb-4 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            ¿Ya tienes una inmobiliaria creada con esta cuenta? Pulsa para volver a cargarla.
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={async () => {
                await refreshTenants();
                navigate("/", { replace: true });
              }}
            >
              Recargar mis inmobiliarias
            </Button>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenant-name">Nombre de la inmobiliaria</Label>
              <Input
                id="tenant-name"
                placeholder="Vértice Inmobiliaria"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={withDemo} onCheckedChange={(c) => setWithDemo(!!c)} />
              Cargar datos demo (inmuebles, leads, visitas)
            </label>
            <Button type="submit" className="w-full" disabled={busy || !name.trim()}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear espacio
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => signOut().then(() => navigate("/login"))}
            >
              Cerrar sesión
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

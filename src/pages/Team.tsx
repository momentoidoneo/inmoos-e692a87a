/**
 * Team page — REAL data from Cloud.
 *
 * Sections:
 *   - Members: list of users with a role in the active tenant (joined from
 *     user_roles → profiles). Admins can change role / remove.
 *   - Invitations: pending invitations table. Admin/director can invite, copy link, cancel.
 *
 * Role gating done via usePermissions().
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { RoleGate } from "@/components/shared/RoleGate";
import { roleLabel } from "@/lib/labels";
import { Plus, Mail, Copy, Loader2, Link2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/app/AuthContext";
import { invitationsService, type TenantInvitation } from "@/services/invitations.service";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "@/hooks/use-toast";
import { fmtRelative } from "@/lib/format";

interface Member {
  user_id: string;
  role: AppRole;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

const ROLE_OPTIONS: AppRole[] = ["admin", "director", "agente", "backoffice"];

export default function Team() {
  const { activeTenant, user } = useAuth();
  const { can, isAdmin } = usePermissions();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<TenantInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    if (!activeTenant) return;
    setLoading(true);
    try {
      // Members: user_roles for this tenant + their profile
      const { data: roleRows, error: rolesErr } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("tenant_id", activeTenant.id);
      if (rolesErr) throw rolesErr;

      const userIds = Array.from(new Set((roleRows ?? []).map((r) => r.user_id)));
      let profilesMap = new Map<string, { full_name: string | null; email: string; avatar_url: string | null }>();
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url")
          .in("id", userIds);
        profilesMap = new Map(
          (profiles ?? []).map((p) => [p.id, { full_name: p.full_name, email: p.email, avatar_url: p.avatar_url }]),
        );
      }

      const list: Member[] = (roleRows ?? []).map((r) => {
        const p = profilesMap.get(r.user_id);
        return {
          user_id: r.user_id,
          role: r.role as AppRole,
          full_name: p?.full_name ?? null,
          email: p?.email ?? "—",
          avatar_url: p?.avatar_url ?? null,
        };
      });
      setMembers(list);

      if (can("team.invite")) {
        const inv = await invitationsService.list(activeTenant.id);
        setInvitations(inv);
      } else {
        setInvitations([]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cargar el equipo";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [activeTenant, can]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const pendingInvites = useMemo(
    () => invitations.filter((i) => i.status === "pending"),
    [invitations],
  );
  const pastInvites = useMemo(
    () => invitations.filter((i) => i.status !== "pending").slice(0, 10),
    [invitations],
  );

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Equipo</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {members.length} {members.length === 1 ? "miembro" : "miembros"} en {activeTenant?.name ?? "tu inmobiliaria"}
          </p>
        </div>
        <RoleGate permission="team.invite">
          <InviteDialog
            tenantId={activeTenant?.id ?? ""}
            invitedBy={user?.id ?? ""}
            onInvited={loadAll}
          />
        </RoleGate>
      </div>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Miembros</CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y">
          {loading && (
            <div className="p-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </div>
          )}
          {!loading && members.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Aún no hay miembros con rol en esta inmobiliaria.
            </div>
          )}
          {!loading &&
            members.map((m) => (
              <div key={m.user_id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar name={m.full_name ?? m.email} size={40} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {m.full_name ?? m.email}
                      {m.user_id === user?.id && (
                        <span className="ml-2 text-xs text-muted-foreground">(tú)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3 shrink-0" /> {m.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {isAdmin && m.user_id !== user?.id ? (
                    <RoleSelect
                      tenantId={activeTenant?.id ?? ""}
                      member={m}
                      onChanged={loadAll}
                    />
                  ) : (
                    <Badge variant="outline">{roleLabel[m.role]}</Badge>
                  )}
                </div>
              </div>
            ))}
        </CardContent>
      </Card>

      {/* Invitations (admin/director only) */}
      <RoleGate permission="team.invite">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invitaciones pendientes</CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y">
            {pendingInvites.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No hay invitaciones pendientes.
              </div>
            )}
            {pendingInvites.map((inv) => (
              <InvitationRow key={inv.id} invitation={inv} onChanged={loadAll} canCancel={isAdmin} />
            ))}
          </CardContent>
        </Card>

        {pastInvites.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historial</CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y">
              {pastInvites.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-4 text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{inv.email}</span>
                    <Badge variant="outline" className="text-xs">{roleLabel[inv.role]}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <StatusPill status={inv.status} />
                    <span>{fmtRelative(inv.created_at)}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </RoleGate>
    </div>
  );
}

/* ───────── Invite dialog ───────── */

function InviteDialog({
  tenantId,
  invitedBy,
  onInvited,
}: {
  tenantId: string;
  invitedBy: string;
  onInvited: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("agente");
  const [busy, setBusy] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !invitedBy) return;
    setBusy(true);
    try {
      const inv = await invitationsService.create({ tenantId, email, role, invitedBy });
      const link = invitationsService.buildInviteLink(inv.token);
      setCreatedLink(link);
      onInvited();
      toast({ title: "Invitación creada", description: "Comparte el enlace con el invitado." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al crear la invitación";
      toast({ title: "No se pudo invitar", description: message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setEmail("");
    setRole("agente");
    setCreatedLink(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" /> Invitar usuario
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar a la inmobiliaria</DialogTitle>
          <DialogDescription>
            La persona recibirá acceso al espacio de trabajo cuando acepte la invitación.
          </DialogDescription>
        </DialogHeader>

        {!createdLink ? (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inv-email">Email</Label>
              <Input
                id="inv-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agente@inmobiliaria.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-role">Rol</Label>
              <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                <SelectTrigger id="inv-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleLabel[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Crear invitación
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Comparte este enlace con la persona invitada. Caduca en 7 días.
            </p>
            <div className="flex items-center gap-2">
              <Input readOnly value={createdLink} className="font-mono text-xs" />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(createdLink);
                  toast({ title: "Enlace copiado" });
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => reset()}>
                Crear otra
              </Button>
              <Button onClick={() => setOpen(false)}>Hecho</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ───────── Role selector (admin only) ───────── */

function RoleSelect({
  tenantId,
  member,
  onChanged,
}: {
  tenantId: string;
  member: Member;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const change = async (newRole: AppRole) => {
    if (newRole === member.role) return;
    setBusy(true);
    try {
      // Replace role: delete old, insert new (unique on user+tenant+role)
      const { error: delErr } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", member.user_id)
        .eq("tenant_id", tenantId)
        .eq("role", member.role);
      if (delErr) throw delErr;

      const { error: insErr } = await supabase
        .from("user_roles")
        .insert({ user_id: member.user_id, tenant_id: tenantId, role: newRole });
      if (insErr) throw insErr;

      toast({ title: "Rol actualizado" });
      onChanged();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cambiar el rol";
      toast({ title: "No se pudo cambiar", description: message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Select value={member.role} disabled={busy} onValueChange={(v) => change(v as AppRole)}>
      <SelectTrigger className="h-8 w-[140px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLE_OPTIONS.map((r) => (
          <SelectItem key={r} value={r}>
            {roleLabel[r]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ───────── Invitation row ───────── */

function InvitationRow({
  invitation,
  onChanged,
  canCancel,
}: {
  invitation: TenantInvitation;
  onChanged: () => void;
  canCancel: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const link = invitationsService.buildInviteLink(invitation.token);

  const cancel = async () => {
    setBusy(true);
    try {
      await invitationsService.cancel(invitation.id);
      toast({ title: "Invitación cancelada" });
      onChanged();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cancelar";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{invitation.email}</p>
          <p className="text-xs text-muted-foreground">
            Caduca {fmtRelative(invitation.expires_at)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="outline" className="text-xs">{roleLabel[invitation.role]}</Badge>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            navigator.clipboard.writeText(link);
            toast({ title: "Enlace copiado" });
          }}
        >
          <Link2 className="h-4 w-4 mr-1" /> Copiar enlace
        </Button>
        {canCancel && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" disabled={busy} aria-label="Cancelar invitación">
                <X className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Cancelar esta invitación?</AlertDialogTitle>
                <AlertDialogDescription>
                  El enlace dejará de ser válido inmediatamente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Volver</AlertDialogCancel>
                <AlertDialogAction onClick={cancel}>Cancelar invitación</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}

/* ───────── Status pill ───────── */

function StatusPill({ status }: { status: TenantInvitation["status"] }) {
  const map: Record<TenantInvitation["status"], { label: string; className: string }> = {
    pending: { label: "Pendiente", className: "bg-warning/10 text-warning border-warning/20" },
    accepted: { label: "Aceptada", className: "bg-success/10 text-success border-success/20" },
    cancelled: { label: "Cancelada", className: "bg-muted text-muted-foreground border-border" },
    expired: { label: "Caducada", className: "bg-muted text-muted-foreground border-border" },
  };
  const cfg = map[status];
  return (
    <span className={`px-2 py-0.5 rounded border text-xs ${cfg.className}`}>{cfg.label}</span>
  );
}

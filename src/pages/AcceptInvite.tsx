/**
 * /invite/:token — Accept a tenant invitation.
 *
 * Flow:
 *   - If user is not authenticated → redirect to /login?redirect=/invite/:token
 *   - If authenticated → call accept_invitation RPC
 *   - On success → switch to that tenant + go to dashboard
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "@/app/AuthContext";
import { invitationsService } from "@/services/invitations.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading, refreshTenants, switchTenant } = useAuth();

  const [status, setStatus] = useState<"idle" | "running" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!token) return;

    if (!user) {
      navigate(`/login?redirect=/invite/${token}`, { replace: true });
      return;
    }

    let cancelled = false;
    (async () => {
      setStatus("running");
      const result = await invitationsService.accept(token);
      if (cancelled) return;

      if (result.ok && result.tenant_id) {
        await refreshTenants();
        switchTenant(result.tenant_id);
        setStatus("ok");
        setTimeout(() => navigate("/", { replace: true }), 1200);
      } else {
        setStatus("error");
        setErrorMsg(translateError(result.error));
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user, loading]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 flex flex-col items-center text-center gap-4">
          {status === "running" || status === "idle" ? (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <h1 className="text-xl font-semibold">Procesando invitación…</h1>
              <p className="text-sm text-muted-foreground">Verificando el enlace.</p>
            </>
          ) : status === "ok" ? (
            <>
              <CheckCircle2 className="h-10 w-10 text-success" />
              <h1 className="text-xl font-semibold">Invitación aceptada</h1>
              <p className="text-sm text-muted-foreground">Te llevamos al panel…</p>
            </>
          ) : (
            <>
              <XCircle className="h-10 w-10 text-danger" />
              <h1 className="text-xl font-semibold">No se pudo aceptar la invitación</h1>
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <Button onClick={() => navigate("/", { replace: true })}>Ir al inicio</Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function translateError(code?: string): string {
  switch (code) {
    case "invalid_token":
      return "El enlace de invitación no es válido.";
    case "invitation_not_pending":
      return "Esta invitación ya fue utilizada o cancelada.";
    case "invitation_expired":
      return "Esta invitación ha caducado. Pide una nueva al administrador.";
    case "email_mismatch":
      return "Esta invitación es para otro email. Inicia sesión con la cuenta correcta.";
    case "not_authenticated":
      return "Debes iniciar sesión para aceptar la invitación.";
    default:
      return code ?? "Error desconocido.";
  }
}

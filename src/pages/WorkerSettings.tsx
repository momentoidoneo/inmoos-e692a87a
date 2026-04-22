/**
 * Worker configuration page — super_admin only.
 * Lets the super-admin set the shared scraper worker URL/token, Coolify API
 * credentials, and proxy provider settings. Provides Deploy / Restart / Sync env
 * actions that hit the `worker-provision` Edge Function.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/app/AuthContext";
import {
  getWorkerConfig, upsertWorkerConfig, getRecentHeartbeats, callProvision,
  isWorkerOnline, type WorkerConfig, type WorkerHeartbeat,
} from "@/services/worker.service";
import {
  Loader2, RefreshCw, Rocket, RotateCw, Save, ShieldAlert, Wifi, WifiOff,
} from "lucide-react";

const PROXY_PROVIDERS = [
  { value: "brightdata", label: "Bright Data" },
  { value: "smartproxy", label: "Smartproxy / Decodo" },
  { value: "iproyal", label: "IPRoyal" },
  { value: "custom", label: "Otro (HTTP/SOCKS5)" },
];

const emptyConfig: WorkerConfig = {
  worker_url: "",
  worker_token: "",
  coolify_api_url: "",
  coolify_api_token: "",
  coolify_app_uuid: "",
  proxy_provider: "",
  proxy_host: "",
  proxy_user: "",
  proxy_pass: "",
  proxy_country: "es",
  status: "not_configured",
  last_version: null,
  last_heartbeat_at: null,
  notes: "",
};

export default function WorkerSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isSuperAdmin, role } = usePermissions();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [config, setConfig] = useState<WorkerConfig>(emptyConfig);
  const [heartbeats, setHeartbeats] = useState<WorkerHeartbeat[]>([]);

  useEffect(() => {
    if (role && !isSuperAdmin) navigate("/configuracion", { replace: true });
  }, [role, isSuperAdmin, navigate]);

  const refresh = async () => {
    try {
      const [cfg, hbs] = await Promise.all([getWorkerConfig(), getRecentHeartbeats(20)]);
      if (cfg) setConfig({ ...emptyConfig, ...cfg });
      setHeartbeats(hbs);
    } catch (e: any) {
      toast({ title: "Error al cargar", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  if (!role) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">Acceso restringido</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta página solo es accesible para super-administradores del sistema.
        </p>
      </div>
    );
  }

  const set = <K extends keyof WorkerConfig>(k: K, v: WorkerConfig[K]) =>
    setConfig((c) => ({ ...c, [k]: v }));

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const saved = await upsertWorkerConfig(config, user.id);
      setConfig({ ...emptyConfig, ...saved });
      toast({ title: "Configuración guardada" });
    } catch (e: any) {
      toast({ title: "No se pudo guardar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (action: "deploy" | "restart" | "sync_env", label: string) => {
    setBusyAction(action);
    try {
      const res = await callProvision(action);
      toast({
        title: `${label} enviado`,
        description: res?.ok ? "Coolify recibió la orden correctamente." : "Coolify devolvió un error. Revisa logs.",
        variant: res?.ok ? "default" : "destructive",
      });
      await refresh();
    } catch (e: any) {
      toast({ title: `Error en ${label}`, description: e.message, variant: "destructive" });
    } finally {
      setBusyAction(null);
    }
  };

  const online = isWorkerOnline(config);
  const lastHb = config.last_heartbeat_at
    ? new Date(config.last_heartbeat_at).toLocaleString("es-ES")
    : "Nunca";

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Worker de scraping</h1>
          <p className="text-sm text-muted-foreground">
            Configuración del worker compartido que ejecuta búsquedas reales en portales inmobiliarios.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refrescar
        </Button>
      </header>

      {/* Estado actual */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Estado del worker
                {online ? (
                  <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15">
                    <Wifi className="mr-1 h-3 w-3" /> Online
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <WifiOff className="mr-1 h-3 w-3" /> Offline
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Último heartbeat: {lastHb}</CardDescription>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              {config.last_version && <p>Versión: <span className="font-mono">{config.last_version}</span></p>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Button
              onClick={() => handleAction("deploy", "Despliegue")}
              disabled={busyAction !== null}
              className="w-full"
            >
              {busyAction === "deploy" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="mr-2 h-4 w-4" />
              )}
              Desplegar
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleAction("sync_env", "Sync env vars")}
              disabled={busyAction !== null}
              className="w-full"
            >
              {busyAction === "sync_env" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Sincronizar variables
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAction("restart", "Reinicio")}
              disabled={busyAction !== null}
              className="w-full"
            >
              {busyAction === "restart" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCw className="mr-2 h-4 w-4" />
              )}
              Reiniciar
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Worker endpoint + token */}
          <Card>
            <CardHeader>
              <CardTitle>Endpoint del worker</CardTitle>
              <CardDescription>URL pública y token compartido.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="worker_url">Worker URL</Label>
                  <Input
                    id="worker_url"
                    placeholder="https://scraper.tudominio.com"
                    value={config.worker_url ?? ""}
                    onChange={(e) => set("worker_url", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="worker_token">Worker Token (compartido)</Label>
                  <Input
                    id="worker_token"
                    type="password"
                    placeholder="••••••••••••"
                    value={config.worker_token ?? ""}
                    onChange={(e) => set("worker_token", e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                El mismo token debe estar como <code className="font-mono">WORKER_TOKEN</code> en el contenedor del worker.
              </p>
            </CardContent>
          </Card>

          {/* Coolify */}
          <Card>
            <CardHeader>
              <CardTitle>Coolify</CardTitle>
              <CardDescription>
                Datos para que Lovable pueda desplegar/reiniciar el worker automáticamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="coolify_api_url">Coolify API URL</Label>
                <Input
                  id="coolify_api_url"
                  placeholder="https://coolify.tudominio.com/api/v1"
                  value={config.coolify_api_url ?? ""}
                  onChange={(e) => set("coolify_api_url", e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="coolify_api_token">Personal Access Token</Label>
                  <Input
                    id="coolify_api_token"
                    type="password"
                    placeholder="1|abcdef…"
                    value={config.coolify_api_token ?? ""}
                    onChange={(e) => set("coolify_api_token", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coolify_app_uuid">Application UUID</Label>
                  <Input
                    id="coolify_app_uuid"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={config.coolify_app_uuid ?? ""}
                    onChange={(e) => set("coolify_app_uuid", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Proxies */}
          <Card>
            <CardHeader>
              <CardTitle>Proxies residenciales</CardTitle>
              <CardDescription>
                Credenciales del proveedor. Se inyectan al worker mediante "Sincronizar variables".
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Proveedor</Label>
                  <Select
                    value={config.proxy_provider ?? ""}
                    onValueChange={(v) => set("proxy_provider", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROXY_PROVIDERS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proxy_country">País (ISO-2)</Label>
                  <Input
                    id="proxy_country"
                    placeholder="es"
                    value={config.proxy_country ?? ""}
                    onChange={(e) => set("proxy_country", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="proxy_host">Host:Puerto</Label>
                <Input
                  id="proxy_host"
                  placeholder="brd.superproxy.io:22225"
                  value={config.proxy_host ?? ""}
                  onChange={(e) => set("proxy_host", e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="proxy_user">Usuario</Label>
                  <Input
                    id="proxy_user"
                    value={config.proxy_user ?? ""}
                    onChange={(e) => set("proxy_user", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proxy_pass">Contraseña</Label>
                  <Input
                    id="proxy_pass"
                    type="password"
                    value={config.proxy_pass ?? ""}
                    onChange={(e) => set("proxy_pass", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notas */}
          <Card>
            <CardHeader>
              <CardTitle>Notas internas</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={3}
                placeholder="Apuntes operativos del worker (opcional)…"
                value={config.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Guardar configuración
            </Button>
          </div>

          <Separator />

          {/* Heartbeats */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico de heartbeats</CardTitle>
              <CardDescription>Últimas señales de vida recibidas del worker.</CardDescription>
            </CardHeader>
            <CardContent>
              {heartbeats.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no se ha recibido ningún heartbeat.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground">
                      <tr>
                        <th className="py-2 pr-4">Fecha</th>
                        <th className="py-2 pr-4">Worker</th>
                        <th className="py-2 pr-4">Versión</th>
                        <th className="py-2 pr-4">En cola</th>
                        <th className="py-2 pr-4">Activos</th>
                        <th className="py-2 pr-4">24h</th>
                        <th className="py-2 pr-4">Éxito</th>
                        <th className="py-2 pr-4">Latencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {heartbeats.map((h) => (
                        <tr key={h.id} className="border-t">
                          <td className="py-2 pr-4">{new Date(h.received_at).toLocaleString("es-ES")}</td>
                          <td className="py-2 pr-4 font-mono text-xs">{h.worker_id}</td>
                          <td className="py-2 pr-4 font-mono text-xs">{h.version ?? "—"}</td>
                          <td className="py-2 pr-4">{h.queue_depth}</td>
                          <td className="py-2 pr-4">{h.active_jobs}</td>
                          <td className="py-2 pr-4">{h.jobs_last_24h}</td>
                          <td className="py-2 pr-4">{(Number(h.success_rate) * 100).toFixed(1)}%</td>
                          <td className="py-2 pr-4">{Math.round(h.avg_latency_ms / 1000)}s</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

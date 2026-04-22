/**
 * SupabaseAccessGuide
 * Explica al super-admin por qué el dashboard de Supabase aparece como "sin acceso"
 * cuando el backend está gestionado por Lovable Cloud, y qué alternativas tiene
 * para gestionar el proyecto y los secrets (incluido el SERVICE_ROLE_KEY).
 */
import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { HelpCircle, KeyRound, ShieldCheck, ExternalLink, AlertTriangle } from "lucide-react";

export function SupabaseAccessGuide() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <KeyRound className="mr-2 h-4 w-4" />
          Acceso al backend
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Cómo acceder al backend y al Service Role Key
          </DialogTitle>
          <DialogDescription>
            Guía paso a paso para entender por qué el dashboard externo te dice "sin acceso"
            y cómo gestionar el proyecto correctamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Por qué el link te da "sin acceso"</AlertTitle>
            <AlertDescription className="mt-1">
              Este proyecto usa <strong>Lovable Cloud</strong>: el backend (base de datos,
              auth, edge functions) se aloja en una organización gestionada por Lovable,
              no en tu cuenta personal de Supabase. Por eso, al abrir un link
              <code className="mx-1 rounded bg-muted px-1 font-mono text-xs">supabase.com/dashboard/project/...</code>
              ves "Project not found" — tu usuario no es miembro de esa organización.
              No es un error tuyo, es por diseño.
            </AlertDescription>
          </Alert>

          <section className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Badge variant="secondary">Opción 1</Badge>
              Gestionar todo desde Lovable (recomendado)
            </h3>
            <ol className="ml-5 list-decimal space-y-2 text-muted-foreground">
              <li>
                En la barra lateral de Lovable abre <strong>Cloud</strong>.
              </li>
              <li>
                Desde ahí puedes ver <strong>Database</strong>, <strong>Users</strong>,
                <strong> Storage</strong>, <strong>Edge Functions</strong>, <strong>Logs</strong> y
                <strong> Secrets</strong> sin salir de Lovable.
              </li>
              <li>
                Para los secrets (incluido <code className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</code>):
                <strong> Cloud → Secrets</strong>. Los valores nunca son visibles, pero puedes
                <strong> rotar / actualizar</strong> el valor cuando necesites uno nuevo.
              </li>
            </ol>
            <p className="text-xs text-muted-foreground">
              Permisos necesarios: ser <strong>owner</strong> o <strong>admin</strong> del workspace de Lovable.
            </p>
          </section>

          <Separator />

          <section className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Badge variant="secondary">Opción 2</Badge>
              Conectar tu propio Supabase (acceso completo al dashboard)
            </h3>
            <p className="text-muted-foreground">
              Si quieres tener el backend en <em>tu</em> cuenta de Supabase y poder entrar al
              dashboard de supabase.com con tu usuario:
            </p>
            <ol className="ml-5 list-decimal space-y-2 text-muted-foreground">
              <li>
                Crea una cuenta en{" "}
                <a
                  href="https://supabase.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline inline-flex items-center gap-1"
                >
                  supabase.com <ExternalLink className="h-3 w-3" />
                </a>{" "}
                (o usa una existente).
              </li>
              <li>Crea un nuevo proyecto en tu organización.</li>
              <li>
                En Lovable, abre <strong>Connectors → Supabase</strong> y conecta ese proyecto.
              </li>
              <li>
                Pide migrar los datos del proyecto Cloud actual al tuyo (es un cambio mayor:
                requiere export/import de tablas y reemplazo de secrets).
              </li>
            </ol>
            <Alert variant="default" className="mt-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Una vez activado Lovable Cloud, no se puede desactivar para este proyecto.
                Migrar a un Supabase propio requiere planificación; pídelo solo si realmente
                necesitas acceso directo al dashboard externo.
              </AlertDescription>
            </Alert>
          </section>

          <Separator />

          <section className="space-y-3">
            <h3 className="font-semibold">Sobre el Service Role Key</h3>
            <ul className="ml-5 list-disc space-y-1 text-muted-foreground">
              <li>
                Es una clave que <strong>salta todas las reglas RLS</strong>. Solo se usa en
                edge functions y backend, <strong>nunca</strong> en el frontend.
              </li>
              <li>
                En este proyecto ya está configurada como secret
                (<code className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</code>) y las
                funciones la leen automáticamente.
              </li>
              <li>
                Por seguridad, ni Lovable ni el chat pueden mostrarte su valor. Si necesitas
                un valor nuevo (por ejemplo para una herramienta externa), <strong>rótala</strong>
                {" "}desde <strong>Cloud → Secrets</strong> y guarda el nuevo valor en el momento.
              </li>
            </ul>
          </section>

          <div className="flex justify-end pt-2">
            <Button onClick={() => setOpen(false)}>Entendido</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * One-time legal notice for the scraper module.
 * Persists acceptance in profiles.scraper_terms_accepted_at.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/app/AppContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export function ScraperTermsModal() {
  const { user } = useApp();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("scraper_terms_accepted_at")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!error && !data?.scraper_terms_accepted_at) setOpen(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  const accept = async () => {
    setSubmitting(true);
    const { error } = await supabase
      .from("profiles")
      .update({ scraper_terms_accepted_at: new Date().toISOString() })
      .eq("id", user.id);
    setSubmitting(false);
    if (error) {
      toast.error("No se pudo registrar la aceptación", { description: error.message });
      return;
    }
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Aviso de uso del módulo Scraper</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 text-sm leading-relaxed">
            <span className="block">
              El uso de este módulo para extraer datos de portales inmobiliarios puede
              infringir sus términos de servicio.
            </span>
            <span className="block">
              Esta funcionalidad debe operarse desde infraestructura propia con proxies
              residenciales y respeto a robots.txt y rate limits razonables. InmoOS
              provee la infraestructura de orquestación; la responsabilidad del uso
              recae en el cliente.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>No, salir</AlertDialogCancel>
          <AlertDialogAction onClick={accept} disabled={submitting}>
            {submitting ? "Guardando…" : "Acepto y entiendo"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

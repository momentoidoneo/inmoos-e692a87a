/**
 * 1-click conversion: scraper_results -> properties or leads.
 */
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/app/AppContext";

export interface ConvertSource {
  id: string;
  portal: string;
  external_id: string;
  title: string | null;
  price: number | null;
  surface_m2: number | null;
  rooms: number | null;
  bathrooms?: number | null;
  property_type?: string | null;
  operation?: string | null;
  address?: string | null;
  zone?: string | null;
  city?: string | null;
  url?: string | null;
  description?: string | null;
  images?: string[] | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "property" | "lead";
  source: ConvertSource | null;
}

export function ConvertResultDialog({ open, onOpenChange, mode, source }: Props) {
  const { tenant } = useApp();
  const [submitting, setSubmitting] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadEmail, setLeadEmail] = useState("");

  if (!source) return null;

  const submit = async () => {
    setSubmitting(true);
    try {
      if (mode === "property") {
        const reference = `SCR-${source.portal.slice(0, 3).toUpperCase()}-${source.external_id.slice(-6)}`;
        const { error } = await supabase.from("properties").insert({
          tenant_id: tenant.id,
          reference,
          title: source.title ?? `Inmueble ${source.portal}`,
          operation: source.operation ?? "venta",
          property_type: source.property_type ?? "piso",
          status: "disponible",
          price: source.price ?? null,
          surface_m2: source.surface_m2 ?? null,
          rooms: source.rooms ?? null,
          bathrooms: source.bathrooms ?? null,
          address: source.address ?? null,
          zone: source.zone ?? null,
          city: source.city ?? null,
          description: source.description ?? null,
          images: source.images ?? [],
          source_portal: source.portal,
          source_url: source.url ?? null,
        });
        if (error) throw new Error(error.message);
        toast.success("Inmueble creado");
      } else {
        if (!leadName.trim()) {
          toast.error("Nombre obligatorio");
          setSubmitting(false);
          return;
        }
        const interests = {
          property_type: source.property_type ?? "piso",
          operation: source.operation ?? "compra",
          zone: source.zone,
          city: source.city,
          source_listing_url: source.url,
          source_portal: source.portal,
        };
        const { error } = await supabase.from("leads").insert({
          tenant_id: tenant.id,
          name: leadName.trim(),
          phone: leadPhone.trim() || null,
          email: leadEmail.trim() || null,
          status: "nuevo",
          source: source.portal,
          interests,
          notes: source.title ? `Interesado en: ${source.title}` : null,
        });
        if (error) throw new Error(error.message);
        toast.success("Lead creado");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error("Error en la conversión", {
        description: e instanceof Error ? e.message : "Error desconocido",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "property" ? "Convertir en inmueble" : "Crear lead asociado"}
          </DialogTitle>
          <DialogDescription>
            {source.title ?? "Resultado del scraper"} · {source.portal}
          </DialogDescription>
        </DialogHeader>

        {mode === "property" ? (
          <div className="text-sm space-y-2">
            <p className="text-muted-foreground">
              Se creará un inmueble en tu cartera con los datos del anuncio. Podrás
              editarlo después.
            </p>
            <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
              <div>Precio: {source.price ? `${source.price.toLocaleString("es-ES")} €` : "—"}</div>
              <div>Superficie: {source.surface_m2 ?? "—"} m²</div>
              <div>Hab./Baños: {source.rooms ?? "—"} / {source.bathrooms ?? "—"}</div>
              <div>Ubicación: {[source.zone, source.city].filter(Boolean).join(", ") || "—"}</div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ln">Nombre *</Label>
              <Input id="ln" value={leadName} onChange={(e) => setLeadName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lp">Teléfono</Label>
                <Input id="lp" value={leadPhone} onChange={(e) => setLeadPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="le">Email</Label>
                <Input id="le" type="email" value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Guardando…" : mode === "property" ? "Crear inmueble" : "Crear lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

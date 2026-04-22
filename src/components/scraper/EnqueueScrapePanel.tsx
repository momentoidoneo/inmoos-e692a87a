/**
 * Structured search form for the scraper module.
 * Builds a normalized `params` object and creates a job via scraper-create-job.
 */
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/app/AppContext";

type Portal = "idealista" | "fotocasa" | "habitaclia";
const PORTALS: Portal[] = ["idealista", "fotocasa", "habitaclia"];

const PROPERTY_TYPES = [
  { v: "piso", l: "Piso" },
  { v: "casa", l: "Casa" },
  { v: "atico", l: "Ático" },
  { v: "duplex", l: "Dúplex" },
  { v: "estudio", l: "Estudio" },
  { v: "local", l: "Local" },
  { v: "oficina", l: "Oficina" },
  { v: "garaje", l: "Garaje" },
  { v: "terreno", l: "Terreno" },
];

const EXTRAS = [
  { k: "ascensor", l: "Ascensor" },
  { k: "terraza", l: "Terraza" },
  { k: "parking", l: "Parking" },
  { k: "piscina", l: "Piscina" },
  { k: "exterior", l: "Exterior" },
  { k: "amueblado", l: "Amueblado" },
];

export function EnqueueScrapePanel() {
  const { tenant } = useApp();
  const [submitting, setSubmitting] = useState(false);

  const [portals, setPortals] = useState<Portal[]>(["idealista"]);
  const [operation, setOperation] = useState("compra");
  const [propertyType, setPropertyType] = useState("piso");
  const [city, setCity] = useState("Barcelona");
  const [zone, setZone] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [surfaceMin, setSurfaceMin] = useState("");
  const [roomsMin, setRoomsMin] = useState("");
  const [listingType, setListingType] = useState("any");
  const [freshness, setFreshness] = useState("any");
  const [extras, setExtras] = useState<Record<string, boolean>>({});

  const togglePortal = (p: Portal, checked: boolean) =>
    setPortals((prev) => (checked ? [...new Set([...prev, p])] : prev.filter((x) => x !== p)));

  const handleSubmit = async () => {
    if (portals.length === 0) {
      toast.error("Selecciona al menos un portal");
      return;
    }
    if (!city.trim()) {
      toast.error("Indica una ciudad");
      return;
    }

    const params: Record<string, unknown> = {
      operation,
      property_type: propertyType,
      city: city.trim(),
    };
    if (zone.trim()) params.zone = zone.trim();
    if (priceMin) params.price_min = Number(priceMin);
    if (priceMax) params.price_max = Number(priceMax);
    if (surfaceMin) params.surface_min = Number(surfaceMin);
    if (roomsMin) params.rooms_min = Number(roomsMin);
    if (listingType !== "any") params.listing_type = listingType;
    if (freshness !== "any") params.freshness = freshness;
    const activeExtras = Object.entries(extras).filter(([, v]) => v).map(([k]) => k);
    if (activeExtras.length) params.extras = activeExtras;

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("scraper-create-job", {
        body: { tenantId: tenant.id, portals, params },
      });
      if (error) throw new Error(error.message);
      const jobId = (data as { jobId?: string } | null)?.jobId;
      toast.success("Job encolado", { description: jobId ? `jobId: ${jobId.slice(0, 8)}…` : undefined });
    } catch (e) {
      toast.error("Error encolando job", {
        description: e instanceof Error ? e.message : "Error desconocido",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Nueva búsqueda</CardTitle>
        <CardDescription>Define filtros y portales · el worker procesa en segundo plano</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Portales</Label>
          <div className="flex gap-3 flex-wrap">
            {PORTALS.map((p) => (
              <label key={p} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={portals.includes(p)}
                  onCheckedChange={(c) => togglePortal(p, !!c)}
                />
                <span className="capitalize">{p}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Operación</Label>
            <Select value={operation} onValueChange={setOperation}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="compra">Compra</SelectItem>
                <SelectItem value="alquiler">Alquiler</SelectItem>
                <SelectItem value="alquiler_temporal">Alquiler temporal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={propertyType} onValueChange={setPropertyType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPES.map((t) => (
                  <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="city">Ciudad</Label>
            <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="zone">Zona / barrio</Label>
            <Input id="zone" value={zone} onChange={(e) => setZone(e.target.value)} placeholder="opcional" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="pmin">Precio min (€)</Label>
            <Input id="pmin" type="number" inputMode="numeric" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pmax">Precio max (€)</Label>
            <Input id="pmax" type="number" inputMode="numeric" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="smin">Superficie min (m²)</Label>
            <Input id="smin" type="number" inputMode="numeric" value={surfaceMin} onChange={(e) => setSurfaceMin(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rmin">Habitaciones min</Label>
            <Input id="rmin" type="number" inputMode="numeric" value={roomsMin} onChange={(e) => setRoomsMin(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Anunciante</Label>
            <Select value={listingType} onValueChange={setListingType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Ambos</SelectItem>
                <SelectItem value="particular">Particular</SelectItem>
                <SelectItem value="agencia">Agencia</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Antigüedad anuncio</Label>
            <Select value={freshness} onValueChange={setFreshness}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Cualquiera</SelectItem>
                <SelectItem value="24h">Últimas 24h</SelectItem>
                <SelectItem value="7d">Últimos 7 días</SelectItem>
                <SelectItem value="30d">Últimos 30 días</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Extras</Label>
          <div className="grid grid-cols-2 gap-2">
            {EXTRAS.map((x) => (
              <label key={x.k} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={!!extras[x.k]}
                  onCheckedChange={(c) => setExtras((p) => ({ ...p, [x.k]: !!c }))}
                />
                <span>{x.l}</span>
              </label>
            ))}
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={submitting} className="w-full">
          {submitting ? "Encolando…" : "Buscar"}
        </Button>
      </CardContent>
    </Card>
  );
}

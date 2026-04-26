import { useEffect, useMemo, useState } from "react";
import { services } from "@/services";
import type { DocumentCategory, DocumentFile, Lead, Property } from "@/modules/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Upload, FileText, Sparkles, Send, Loader2, ExternalLink } from "lucide-react";
import { documentCategoryLabel } from "@/lib/labels";
import { fmtRelative } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/app/AuthContext";

const categories: DocumentCategory[] = [
  "contrato",
  "reserva",
  "nota_simple",
  "escritura",
  "interno",
  "ficha_comercial",
  "identidad",
  "otro",
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function relationLabel(doc: DocumentFile, leads: Lead[], properties: Property[]) {
  if (doc.leadId) return `Lead: ${leads.find((lead) => lead.id === doc.leadId)?.name ?? doc.leadId.slice(0, 8)}`;
  if (doc.propertyId) return `Inmueble: ${properties.find((property) => property.id === doc.propertyId)?.reference ?? doc.propertyId.slice(0, 8)}`;
  return "Sin vincular";
}

export default function Documents() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<DocumentFile[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selected, setSelected] = useState<DocumentFile | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [asking, setAsking] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [openingFile, setOpeningFile] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<DocumentCategory>("otro");
  const [relation, setRelation] = useState("none");

  const selectedMeta = useMemo(() => {
    if (!selected) return [];
    return [
      ["Categoría", documentCategoryLabel[selected.category]],
      ["Estado", selected.status],
      ["Tamaño", formatBytes(selected.sizeBytes)],
      ["Tipo", selected.mimeType || "Sin tipo"],
      ["Vinculación", relationLabel(selected, leads, properties)],
      ["Subido", fmtRelative(selected.uploadedAt)],
    ];
  }, [leads, properties, selected]);

  const loadDocuments = async (selectId?: string) => {
    setLoadingDocs(true);
    try {
      const loaded = await services.documents.list();
      setDocs(loaded);
      setSelected((current) => {
        if (selectId) return loaded.find((doc) => doc.id === selectId) ?? loaded[0] ?? null;
        if (current) return loaded.find((doc) => doc.id === current.id) ?? loaded[0] ?? null;
        return loaded[0] ?? null;
      });
    } catch (e) {
      toast.error("No se pudieron cargar los documentos", { description: (e as Error).message });
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    loadDocuments();
    Promise.all([
      services.leads.list().catch(() => [] as Lead[]),
      services.properties.list().catch(() => [] as Property[]),
    ]).then(([loadedLeads, loadedProperties]) => {
      setLeads(loadedLeads);
      setProperties(loadedProperties);
    });
  }, []);

  const resetUpload = () => {
    setFile(null);
    setCategory("otro");
    setRelation("none");
  };

  const submitUpload = async () => {
    if (!user) {
      toast.error("Necesitas iniciar sesión");
      return;
    }
    if (!file) {
      toast.error("Selecciona un archivo");
      return;
    }

    const [relationType, relationId] = relation.split(":");
    setUploading(true);
    try {
      const uploaded = await services.documents.upload(file, {
        category,
        uploadedBy: user.id,
        leadId: relationType === "lead" ? relationId : undefined,
        propertyId: relationType === "property" ? relationId : undefined,
      });
      await loadDocuments(uploaded.id);
      setUploadOpen(false);
      resetUpload();
      toast.success("Documento subido");
    } catch (e) {
      toast.error("No se pudo subir el documento", { description: (e as Error).message });
    } finally {
      setUploading(false);
    }
  };

  const ask = async () => {
    if (!selected || !question.trim()) return;
    setAsking(true);
    try {
      const res = await services.documents.ask(selected.id, question.trim());
      setAnswer(res);
    } catch (e) {
      toast.error("No se pudo consultar el documento", { description: (e as Error).message });
    } finally {
      setAsking(false);
    }
  };

  const openFile = async () => {
    if (!selected) return;
    setOpeningFile(true);
    try {
      const url = await services.documents.getDownloadUrl(selected.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error("No se pudo abrir el archivo", { description: (e as Error).message });
    } finally {
      setOpeningFile(false);
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documentos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{docs.length} archivos</p>
        </div>
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4 mr-1" />
          Subir documento
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Archivos</CardTitle></CardHeader>
          <CardContent className="p-0 divide-y max-h-[70vh] overflow-auto">
            {loadingDocs && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                Cargando documentos
              </div>
            )}
            {!loadingDocs && docs.map((d) => (
              <button key={d.id} onClick={() => { setSelected(d); setAnswer(""); }} className={`w-full text-left p-3 hover:bg-muted/40 ${selected?.id === d.id ? "bg-muted/60" : ""}`}>
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{d.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{documentCategoryLabel[d.category]} · {fmtRelative(d.uploadedAt)}</p>
                  </div>
                  <StatusBadge status={d.status} kind="document" />
                </div>
              </button>
            ))}
            {!loadingDocs && docs.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No hay documentos todavía.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          {selected ? (
            <>
              <Card>
                <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                  <CardTitle className="text-base break-words">{selected.name}</CardTitle>
                  <Button size="sm" variant="outline" onClick={openFile} disabled={openingFile}>
                    {openingFile ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-1" />}
                    Abrir archivo
                  </Button>
                </CardHeader>
                <CardContent className="text-sm space-y-3">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={selected.status} kind="document" />
                    <span className="text-muted-foreground">{documentCategoryLabel[selected.category]}</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {selectedMeta.map(([label, value]) => (
                      <div key={label} className="rounded-md border bg-muted/30 p-2 text-xs">
                        <span className="text-muted-foreground">{label}: </span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                  {selected.summary && (
                    <div className="rounded-md bg-primary/5 border border-primary/20 p-3">
                      <p className="text-xs font-semibold text-primary flex items-center gap-1 mb-1"><Sparkles className="h-3 w-3" /> Resumen</p>
                      <p>{selected.summary}</p>
                    </div>
                  )}
                  {selected.extractedData && (
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Datos extraídos</p>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(selected.extractedData).map(([k, v]) => (
                          <div key={k} className="text-xs"><span className="text-muted-foreground">{k}:</span> <span className="font-medium">{v}</span></div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary" /> Pregunta al documento</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="¿Cuál es la fecha de firma?" onKeyDown={(e) => { if (e.key === "Enter") ask(); }} />
                    <Button onClick={ask} disabled={asking || !question.trim()}>
                      {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                  {answer && <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">{answer}</div>}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Selecciona o sube un documento.</CardContent></Card>
          )}
        </div>
      </div>

      <Dialog open={uploadOpen} onOpenChange={(open) => { setUploadOpen(open); if (!open) resetUpload(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subir documento</DialogTitle>
            <DialogDescription>El archivo se guardará en Storage privado y quedará visible para los miembros del tenant.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="document-file">Archivo</Label>
              <Input id="document-file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              {file && <p className="text-xs text-muted-foreground">{file.name} · {formatBytes(file.size)}</p>}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Categoría</Label>
                <Select value={category} onValueChange={(value) => setCategory(value as DocumentCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((item) => (
                      <SelectItem key={item} value={item}>{documentCategoryLabel[item]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Vincular a</Label>
                <Select value={relation} onValueChange={setRelation}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin vincular</SelectItem>
                    {leads.map((lead) => (
                      <SelectItem key={lead.id} value={`lead:${lead.id}`}>Lead: {lead.name}</SelectItem>
                    ))}
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={`property:${property.id}`}>Inmueble: {property.reference}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>Cancelar</Button>
            <Button onClick={submitUpload} disabled={uploading || !file}>
              {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
              Subir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

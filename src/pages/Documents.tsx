import { useEffect, useState } from "react";
import { services } from "@/services";
import type { DocumentFile } from "@/modules/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Upload, FileText, Sparkles, Send } from "lucide-react";
import { documentCategoryLabel } from "@/lib/labels";
import { fmtRelative } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function Documents() {
  const [docs, setDocs] = useState<DocumentFile[]>([]);
  const [selected, setSelected] = useState<DocumentFile | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { services.documents.list().then((d) => { setDocs(d); setSelected(d[0] ?? null); }); }, []);

  const ask = async () => {
    if (!selected || !question) return;
    setLoading(true);
    const res = await services.documents.ask(selected.id, question);
    setAnswer(res); setLoading(false);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documentos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{docs.length} archivos</p>
        </div>
        <Button size="sm"><Upload className="h-4 w-4 mr-1" /> Subir documento</Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Archivos</CardTitle></CardHeader>
          <CardContent className="p-0 divide-y max-h-[70vh] overflow-auto">
            {docs.map((d) => (
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
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          {selected ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{selected.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-3">
                  <div className="flex items-center gap-2"><StatusBadge status={selected.status} kind="document" /><span className="text-muted-foreground">{documentCategoryLabel[selected.category]}</span></div>
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
                    <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="¿Cuál es la fecha de firma?" />
                    <Button onClick={ask} disabled={loading || !question}><Send className="h-4 w-4" /></Button>
                  </div>
                  {answer && <div className="rounded-md bg-muted p-3 text-sm">{answer}</div>}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Selecciona un documento.</CardContent></Card>
          )}
        </div>
      </div>
    </div>
  );
}

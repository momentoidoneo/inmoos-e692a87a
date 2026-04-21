import { useEffect, useMemo, useState } from "react";
import { services } from "@/services";
import type { KnowledgeArticle } from "@/modules/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { knowledgeCategoryLabel } from "@/lib/labels";
import { fmtRelative } from "@/lib/format";

export default function Knowledge() {
  const [items, setItems] = useState<KnowledgeArticle[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [selected, setSelected] = useState<KnowledgeArticle | null>(null);

  useEffect(() => { services.knowledge.list().then((k) => { setItems(k); setSelected(k[0] ?? null); }); }, []);

  const filtered = useMemo(() => {
    let r = items;
    if (search) r = r.filter((k) => k.title.toLowerCase().includes(search.toLowerCase()) || k.tags.some((t) => t.includes(search.toLowerCase())));
    if (category !== "all") r = r.filter((k) => k.category === category);
    return r;
  }, [items, search, category]);

  const categories = Object.keys(knowledgeCategoryLabel) as Array<keyof typeof knowledgeCategoryLabel>;

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Base de conocimiento</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{items.length} artículos para alimentar tus agentes IA</p>
        </div>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nuevo artículo</Button>
      </div>

      <div className="grid lg:grid-cols-4 gap-4">
        <aside className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar…" className="pl-8 h-9" />
          </div>
          <Card>
            <CardContent className="p-2 space-y-1">
              <button onClick={() => setCategory("all")} className={`w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted ${category === "all" ? "bg-muted font-medium" : ""}`}>Todas</button>
              {categories.map((c) => (
                <button key={c} onClick={() => setCategory(c)} className={`w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted ${category === c ? "bg-muted font-medium" : ""}`}>
                  {knowledgeCategoryLabel[c]}
                </button>
              ))}
            </CardContent>
          </Card>
        </aside>

        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-sm">Artículos ({filtered.length})</CardTitle></CardHeader>
          <CardContent className="p-0 divide-y max-h-[70vh] overflow-auto">
            {filtered.map((k) => (
              <button key={k.id} onClick={() => setSelected(k)} className={`w-full text-left p-3 hover:bg-muted/40 ${selected?.id === k.id ? "bg-muted/60" : ""}`}>
                <div className="flex items-start gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{k.title}</p>
                    <p className="text-xs text-muted-foreground">{knowledgeCategoryLabel[k.category]} · v{k.version} · {fmtRelative(k.updatedAt)}</p>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          {selected ? (
            <>
              <CardHeader>
                <CardTitle className="text-base">{selected.title}</CardTitle>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Badge variant="secondary">{knowledgeCategoryLabel[selected.category]}</Badge>
                  <Badge variant="outline">v{selected.version}</Badge>
                  {selected.tags.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
                </div>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap text-sm font-sans">{selected.contentMd}</pre>
              </CardContent>
            </>
          ) : (
            <CardContent className="py-12 text-center text-sm text-muted-foreground">Selecciona un artículo.</CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

/**
 * Sheet panel with the scraper worker installation guide.
 * Loads the markdown files from /public/docs/scraper-worker so the super-admin
 * can read the setup instructions without leaving the configuration page.
 */
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BookOpen, Download, ExternalLink, FileText, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

async function downloadFile(url: string, filename: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (e) {
    toast({ title: "Error al descargar", description: String(e), variant: "destructive" });
  }
}

const SOURCES = {
  readme: { url: "/docs/scraper-worker/README.md", label: "Arquitectura" },
  coolify: { url: "/docs/scraper-worker/COOLIFY_SETUP.md", label: "Despliegue (Coolify)" },
} as const;

type Key = keyof typeof SOURCES;

export function WorkerSetupGuide() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Key>("readme");
  const [content, setContent] = useState<Record<Key, string>>({ readme: "", coolify: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    Promise.all(
      (Object.entries(SOURCES) as [Key, { url: string }][]).map(async ([k, { url }]) => {
        const res = await fetch(url);
        return [k, res.ok ? await res.text() : `# Error\n\nNo se pudo cargar \`${url}\`.`] as const;
      }),
    ).then((entries) => {
      if (cancelled) return;
      setContent(Object.fromEntries(entries) as Record<Key, string>);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <BookOpen className="mr-2 h-4 w-4" /> Ver guía
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle>Guía del worker de scraping</SheetTitle>
          <SheetDescription>
            Manual para crear, desplegar y mantener el worker externo.
          </SheetDescription>
        </SheetHeader>

        <Tabs value={active} onValueChange={(v) => setActive(v as Key)} className="mt-4 flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            {(Object.entries(SOURCES) as [Key, { label: string }][]).map(([k, { label }]) => (
              <TabsTrigger key={k} value={k}>{label}</TabsTrigger>
            ))}
          </TabsList>

          {(Object.keys(SOURCES) as Key[]).map((k) => (
            <TabsContent key={k} value={k} className="flex-1 overflow-y-auto mt-4 pr-2">
              {loading ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <article className="prose prose-sm dark:prose-invert max-w-none prose-headings:scroll-mt-4 prose-pre:bg-muted prose-pre:text-foreground prose-code:before:content-none prose-code:after:content-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{content[k]}</ReactMarkdown>
                </article>
              )}
            </TabsContent>
          ))}
        </Tabs>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={() => downloadFile("/docs/scraper-worker/guia-worker-scraping.pdf", "guia-worker-scraping.pdf")}
            >
              <Download className="mr-2 h-4 w-4" /> PDF
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => downloadFile("/docs/scraper-worker/guia-worker-scraping.docx", "guia-worker-scraping.docx")}
            >
              <FileText className="mr-2 h-4 w-4" /> Word (.docx)
            </Button>
          </div>
          <a
            href={SOURCES[active].url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            Abrir pestaña actual <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </SheetContent>
    </Sheet>
  );
}

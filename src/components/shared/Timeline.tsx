import type { Activity } from "@/modules/types";
import { fmtRelative } from "@/lib/format";
import { Circle } from "lucide-react";

export function Timeline({ items }: { items: Activity[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground py-4">Sin actividad reciente.</p>;
  return (
    <ol className="relative">
      {items.map((it, i) => (
        <li key={it.id} className="relative pl-6 pb-4 last:pb-0">
          {i < items.length - 1 && <span className="absolute left-[7px] top-3 bottom-0 w-px bg-border" />}
          <Circle className="absolute left-0 top-1.5 h-3.5 w-3.5 fill-background text-primary" />
          <p className="text-sm text-foreground">{it.message}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{fmtRelative(it.createdAt)}</p>
        </li>
      ))}
    </ol>
  );
}

import { cn } from "@/lib/utils";
import type { LeadScore } from "@/modules/types";
import { Flame, Thermometer, Snowflake, Ban } from "lucide-react";

const config: Record<LeadScore, { label: string; bg: string; text: string; Icon: typeof Flame }> = {
  caliente: { label: "Caliente", bg: "bg-score-hot/10", text: "text-score-hot", Icon: Flame },
  templado: { label: "Templado", bg: "bg-score-warm/10", text: "text-score-warm", Icon: Thermometer },
  frio: { label: "Frío", bg: "bg-score-cold/10", text: "text-score-cold", Icon: Snowflake },
  descartable: { label: "Descartable", bg: "bg-score-discard/10", text: "text-score-discard", Icon: Ban },
};

export function ScoreBadge({ score, size = "sm" }: { score: LeadScore; size?: "sm" | "md" }) {
  const c = config[score];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md font-medium", c.bg, c.text,
      size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm")}>
      <c.Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {c.label}
    </span>
  );
}

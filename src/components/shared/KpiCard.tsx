import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: { value: number; positive?: boolean };
  hint?: string;
  Icon?: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}

const toneClasses: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
};

export function KpiCard({ label, value, delta, hint, Icon, tone = "default" }: KpiCardProps) {
  return (
    <div className="rounded-lg border bg-card p-4 transition-colors hover:bg-elevated">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground truncate">{hint}</p>}
        </div>
        {Icon && (
          <div className={cn("h-9 w-9 shrink-0 rounded-md grid place-items-center", toneClasses[tone])}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      {delta && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          <span className={cn("inline-flex items-center gap-0.5 font-medium", delta.positive ? "text-success" : "text-destructive")}>
            {delta.positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(delta.value)}%
          </span>
          <span className="text-muted-foreground">vs período anterior</span>
        </div>
      )}
    </div>
  );
}

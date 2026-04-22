import { useEffect, useState } from "react";
import { pingWorker, type PingResult } from "@/lib/scraper-worker";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function WorkerStatusBadge() {
  const [state, setState] = useState<PingResult & { loading: boolean }>({
    ok: false,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const res = await pingWorker();
      if (!cancelled) setState({ ...res, loading: false });
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const online = state.ok;
  const label = state.loading ? "Comprobando…" : online ? "Worker online" : "Worker offline";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium">
            <span
              className={cn(
                "size-2 rounded-full",
                state.loading
                  ? "bg-muted-foreground animate-pulse"
                  : online
                  ? "bg-success"
                  : "bg-destructive",
              )}
              aria-hidden
            />
            <span className="text-foreground">{label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {online ? (
            <div className="text-xs">
              <div className="font-medium">{state.service ?? "scraper-worker"}</div>
              {state.version && <div className="text-muted-foreground">v{state.version}</div>}
            </div>
          ) : (
            <span className="text-xs">El worker no responde</span>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

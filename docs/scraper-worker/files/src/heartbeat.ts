import { fetch } from "undici";
import { scrapeQueue } from "./queue.js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const TOKEN = process.env.WORKER_TOKEN!;
const WORKER_ID = process.env.WORKER_ID ?? "worker-default";
const VERSION = process.env.WORKER_VERSION ?? "0.0.0";
const INTERVAL = Number(process.env.HEARTBEAT_INTERVAL_MS ?? 30_000);

export function startHeartbeat() {
  const ping = async () => {
    try {
      const counts = await scrapeQueue.getJobCounts("waiting", "active", "completed", "failed");
      const completed = counts.completed ?? 0;
      const failed = counts.failed ?? 0;
      const total = completed + failed;
      const successRate = total > 0 ? completed / total : 1;

      await fetch(`${SUPABASE_URL}/functions/v1/worker-heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Worker-Token": TOKEN },
        body: JSON.stringify({
          workerId: WORKER_ID,
          version: VERSION,
          queueDepth: counts.waiting ?? 0,
          activeJobs: counts.active ?? 0,
          metrics: { jobsLast24h: total, successRate, avgLatencyMs: 0 },
        }),
      });
    } catch (e) {
      console.error("[heartbeat] failed", e);
    }
  };
  ping();
  setInterval(ping, INTERVAL);
}

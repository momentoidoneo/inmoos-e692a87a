import { Worker } from "bullmq";
import { connection } from "./queue.js";
import { ingestResults, finishJob, failJob } from "./ingest.js";
import { searchIdealista } from "./adapters/idealista.js";
import { searchFotocasa } from "./adapters/fotocasa.js";
import { searchHabitaclia } from "./adapters/habitaclia.js";

const adapters: Record<string, any> = {
  idealista: searchIdealista,
  fotocasa: searchFotocasa,
  habitaclia: searchHabitaclia,
};

const concurrency = Number(process.env.MAX_CONCURRENT_JOBS ?? 3);

new Worker(
  "scrape",
  async (job) => {
    const { jobId, tenantId, params, portals } = job.data as {
      jobId: string;
      tenantId: string;
      params: any;
      portals: string[];
    };

    const progress: Record<string, { status: string; count: number }> = {};
    portals.forEach((p) => (progress[p] = { status: "queued", count: 0 }));

    try {
      for (const portal of portals) {
        progress[portal] = { status: "running", count: 0 };
        const adapter = adapters[portal];
        if (!adapter) {
          progress[portal] = { status: "error", count: 0 };
          continue;
        }
        const onBatch = async (batch: any[]) => {
          progress[portal].count += batch.length;
          await ingestResults({ jobId, tenantId, results: batch.map((r) => ({ ...r, portal })), progress, status: "running" });
        };
        await adapter(params, onBatch);
        progress[portal].status = "done";
      }
      await finishJob({ jobId, tenantId, progress });
    } catch (err: any) {
      console.error("[worker] job failed", jobId, err);
      await failJob({ jobId, tenantId, progress, error: err?.message ?? "unknown_error" });
      throw err;
    }
  },
  { connection, concurrency }
);

console.log(`[worker] processor ready (concurrency=${concurrency})`);

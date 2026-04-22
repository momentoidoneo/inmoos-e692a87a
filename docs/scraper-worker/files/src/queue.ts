import { Queue } from "bullmq";
import IORedis from "ioredis";

export const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

export const scrapeQueue = new Queue("scrape", { connection });

export async function enqueueJob(data: {
  jobId: string;
  tenantId: string;
  params: Record<string, any>;
  portals: string[];
}) {
  await scrapeQueue.add("scrape", data, {
    jobId: data.jobId,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
    attempts: 2,
    backoff: { type: "exponential", delay: 60_000 },
  });
}

export async function getQueueStats() {
  const counts = await scrapeQueue.getJobCounts("waiting", "active", "completed", "failed");
  return { queue: counts };
}

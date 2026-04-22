import { fetch } from "undici";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const TOKEN = process.env.WORKER_TOKEN!;
const ENDPOINT = `${SUPABASE_URL}/functions/v1/scraper-ingest-results`;

async function post(body: any) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Worker-Token": TOKEN },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("[ingest] failed", res.status, text);
  }
}

export async function ingestResults(payload: {
  jobId: string;
  tenantId: string;
  results: any[];
  progress: Record<string, any>;
  status: "running" | "done" | "error";
}) {
  await post(payload);
}

export async function finishJob(payload: { jobId: string; tenantId: string; progress: Record<string, any> }) {
  await post({ ...payload, results: [], status: "done" });
}

export async function failJob(payload: { jobId: string; tenantId: string; progress: Record<string, any>; error: string }) {
  await post({ ...payload, results: [], status: "error" });
}

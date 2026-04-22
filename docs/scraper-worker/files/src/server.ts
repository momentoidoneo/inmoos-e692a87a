import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { z } from "zod";
import { enqueueJob, getQueueStats } from "./queue.js";
import { startHeartbeat } from "./heartbeat.js";
import "./worker.js"; // arranca el procesador BullMQ

const app = new Hono();
const TOKEN = process.env.WORKER_TOKEN!;

const JobSchema = z.object({
  jobId: z.string().uuid(),
  tenantId: z.string().uuid(),
  params: z.record(z.any()),
  portals: z.array(z.enum(["idealista", "fotocasa", "habitaclia"])).min(1),
});

app.use("*", async (c, next) => {
  if (c.req.path === "/health") return next();
  const token = c.req.header("X-Worker-Token");
  if (token !== TOKEN) return c.json({ error: "unauthorized" }, 401);
  await next();
});

app.get("/health", async (c) => {
  const stats = await getQueueStats();
  return c.json({ ok: true, version: process.env.WORKER_VERSION, ...stats });
});

app.post("/jobs", async (c) => {
  const body = await c.req.json();
  const parsed = JobSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  await enqueueJob(parsed.data);
  return c.json({ ok: true, queued: true }, 202);
});

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port });
console.log(`[worker] listening on :${port}`);

startHeartbeat();

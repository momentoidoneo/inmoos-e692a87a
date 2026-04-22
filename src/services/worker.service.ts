/**
 * Worker config service — super-admin only.
 * Manages the singleton row in `worker_config` and reads `worker_heartbeats`.
 */
import { supabase } from "@/integrations/supabase/client";

export interface WorkerConfig {
  id?: string;
  worker_url: string | null;
  worker_token: string | null;
  coolify_api_url: string | null;
  coolify_api_token: string | null;
  coolify_app_uuid: string | null;
  proxy_provider: string | null;
  proxy_host: string | null;
  proxy_user: string | null;
  proxy_pass: string | null;
  proxy_country: string | null;
  status: string;
  last_version: string | null;
  last_heartbeat_at: string | null;
  notes: string | null;
}

export interface WorkerHeartbeat {
  id: string;
  worker_id: string;
  version: string | null;
  queue_depth: number;
  active_jobs: number;
  jobs_last_24h: number;
  success_rate: number;
  avg_latency_ms: number;
  received_at: string;
}

export async function getWorkerConfig(): Promise<WorkerConfig | null> {
  const { data, error } = await supabase
    .from("worker_config")
    .select("*")
    .eq("singleton", true)
    .maybeSingle();
  if (error) throw error;
  return (data as WorkerConfig | null) ?? null;
}

export async function upsertWorkerConfig(
  patch: Partial<WorkerConfig>,
  userId: string,
): Promise<WorkerConfig> {
  const existing = await getWorkerConfig();
  if (existing?.id) {
    const { data, error } = await supabase
      .from("worker_config")
      .update({ ...patch, updated_by: userId })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return data as WorkerConfig;
  }
  const { data, error } = await supabase
    .from("worker_config")
    .insert({ ...patch, singleton: true, updated_by: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data as WorkerConfig;
}

export async function getRecentHeartbeats(limit = 30): Promise<WorkerHeartbeat[]> {
  const { data, error } = await supabase
    .from("worker_heartbeats")
    .select("*")
    .order("received_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as WorkerHeartbeat[];
}

export type ProvisionAction = "deploy" | "restart" | "sync_env";

export async function callProvision(action: ProvisionAction) {
  const { data, error } = await supabase.functions.invoke("worker-provision", {
    body: { action },
  });
  if (error) throw error;
  return data;
}

/** Worker is considered online if last heartbeat is < 90s ago. */
export function isWorkerOnline(cfg: WorkerConfig | null): boolean {
  if (!cfg?.last_heartbeat_at) return false;
  return Date.now() - new Date(cfg.last_heartbeat_at).getTime() < 90_000;
}

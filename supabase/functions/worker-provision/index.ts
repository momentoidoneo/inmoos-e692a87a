// worker-provision: super-admin only. Talks to the Coolify API to deploy,
// redeploy or restart the shared scraper worker, and to push env vars.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  action: z.enum(["deploy", "restart", "sync_env"]),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify super_admin
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin");
    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { action } = parsed.data;

    const { data: cfg } = await admin
      .from("worker_config")
      .select("*")
      .eq("singleton", true)
      .maybeSingle();

    if (!cfg?.coolify_api_url || !cfg?.coolify_api_token || !cfg?.coolify_app_uuid) {
      return new Response(
        JSON.stringify({ error: "Coolify is not configured. Fill API URL, token and App UUID first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const baseUrl = cfg.coolify_api_url.replace(/\/$/, "");
    const headers = {
      Authorization: `Bearer ${cfg.coolify_api_token}`,
      "Content-Type": "application/json",
    };

    let endpoint = "";
    let method: "POST" | "GET" = "POST";

    if (action === "restart") {
      endpoint = `${baseUrl}/applications/${cfg.coolify_app_uuid}/restart`;
    } else if (action === "deploy") {
      endpoint = `${baseUrl}/applications/${cfg.coolify_app_uuid}/deploy`;
    } else if (action === "sync_env") {
      // Push env vars to Coolify (proxy creds + worker token + supabase url).
      const envs = [
        { key: "WORKER_TOKEN", value: cfg.worker_token ?? "" },
        { key: "SUPABASE_URL", value: Deno.env.get("SUPABASE_URL") ?? "" },
        { key: "PROXY_PROVIDER", value: cfg.proxy_provider ?? "" },
        { key: "PROXY_HOST", value: cfg.proxy_host ?? "" },
        { key: "PROXY_USER", value: cfg.proxy_user ?? "" },
        { key: "PROXY_PASS", value: cfg.proxy_pass ?? "" },
        { key: "PROXY_COUNTRY", value: cfg.proxy_country ?? "es" },
      ];
      const results: any[] = [];
      for (const env of envs) {
        const r = await fetch(`${baseUrl}/applications/${cfg.coolify_app_uuid}/envs`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ key: env.key, value: env.value, is_preview: false }),
        });
        results.push({ key: env.key, status: r.status });
      }
      return new Response(JSON.stringify({ ok: true, action, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(endpoint, { method, headers });
    const text = await res.text();

    return new Response(
      JSON.stringify({ ok: res.ok, action, status: res.status, response: text.slice(0, 500) }),
      { status: res.ok ? 200 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

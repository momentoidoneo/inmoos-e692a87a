import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-automation-token",
};

type Body = {
  tenantId?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const expected = Deno.env.get("AUTOMATION_RUNNER_TOKEN");
    const provided = req.headers.get("X-Automation-Token");
    if (expected && provided !== expected) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = req.method === "POST" ? await req.json().catch(() => ({} as Body)) as Body : {};
    const tenantIds = body.tenantId
      ? [body.tenantId]
      : ((await admin.from("tenants").select("id")).data ?? []).map((tenant) => tenant.id as string);

    const results = [];
    for (const tenantId of tenantIds) {
      const { data, error } = await admin.rpc("process_due_automations", { _tenant_id: tenantId });
      results.push({ tenantId, data, error: error?.message ?? null });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

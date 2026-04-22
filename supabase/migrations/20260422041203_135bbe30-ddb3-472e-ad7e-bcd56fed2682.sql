-- Función helper para detectar super-admins
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'::public.app_role
  )
$$;

-- Tabla singleton de configuración del worker
CREATE TABLE public.worker_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true,
  worker_url text,
  worker_token text,
  coolify_api_url text,
  coolify_api_token text,
  coolify_app_uuid text,
  proxy_provider text,
  proxy_host text,
  proxy_user text,
  proxy_pass text,
  proxy_country text DEFAULT 'es',
  status text NOT NULL DEFAULT 'not_configured',
  last_version text,
  last_heartbeat_at timestamptz,
  notes text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT worker_config_singleton_unique UNIQUE (singleton)
);

ALTER TABLE public.worker_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view worker config"
  ON public.worker_config FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert worker config"
  ON public.worker_config FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update worker config"
  ON public.worker_config FOR UPDATE
  USING (public.is_super_admin(auth.uid()));

CREATE TRIGGER worker_config_updated_at
  BEFORE UPDATE ON public.worker_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Tabla histórico de heartbeats
CREATE TABLE public.worker_heartbeats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id text NOT NULL,
  version text,
  queue_depth integer DEFAULT 0,
  active_jobs integer DEFAULT 0,
  jobs_last_24h integer DEFAULT 0,
  success_rate numeric(5,4) DEFAULT 1.0,
  avg_latency_ms integer DEFAULT 0,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_worker_heartbeats_received_at ON public.worker_heartbeats (received_at DESC);

ALTER TABLE public.worker_heartbeats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view heartbeats"
  ON public.worker_heartbeats FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- =====================================================
-- PARTE A: Tablas centrales del CRM
-- =====================================================

-- LEADS
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'nuevo',
  source TEXT,
  tags TEXT[] DEFAULT '{}',
  score INTEGER DEFAULT 0,
  assigned_to UUID,
  budget_min NUMERIC,
  budget_max NUMERIC,
  interests JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_leads_tenant_status ON public.leads(tenant_id, status);
CREATE INDEX idx_leads_assigned ON public.leads(assigned_to);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view leads" ON public.leads FOR SELECT USING (public.is_member_of_tenant(auth.uid(), tenant_id));
CREATE POLICY "Members can insert leads" ON public.leads FOR INSERT WITH CHECK (public.is_member_of_tenant(auth.uid(), tenant_id));
CREATE POLICY "Members can update leads" ON public.leads FOR UPDATE USING (public.is_member_of_tenant(auth.uid(), tenant_id));
CREATE POLICY "Admins/directors can delete leads" ON public.leads FOR DELETE USING (public.has_role(auth.uid(), tenant_id, 'admin') OR public.has_role(auth.uid(), tenant_id, 'director'));

CREATE TRIGGER leads_set_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- LEAD NOTES
CREATE TABLE public.lead_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lead_notes_lead ON public.lead_notes(lead_id);
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view lead notes" ON public.lead_notes FOR SELECT USING (public.is_member_of_tenant(auth.uid(), tenant_id));
CREATE POLICY "Members can insert lead notes" ON public.lead_notes FOR INSERT WITH CHECK (public.is_member_of_tenant(auth.uid(), tenant_id) AND author_id = auth.uid());
CREATE POLICY "Authors can delete own notes" ON public.lead_notes FOR DELETE USING (author_id = auth.uid() OR public.has_role(auth.uid(), tenant_id, 'admin'));

-- LEAD ACTIVITY
CREATE TABLE public.lead_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lead_activity_lead ON public.lead_activity(lead_id, created_at DESC);
ALTER TABLE public.lead_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view lead activity" ON public.lead_activity FOR SELECT USING (public.is_member_of_tenant(auth.uid(), tenant_id));
CREATE POLICY "Members can insert lead activity" ON public.lead_activity FOR INSERT WITH CHECK (public.is_member_of_tenant(auth.uid(), tenant_id));

-- PROPERTIES
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  reference TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  address TEXT,
  zone TEXT,
  city TEXT,
  operation TEXT NOT NULL DEFAULT 'venta',
  property_type TEXT NOT NULL DEFAULT 'piso',
  status TEXT NOT NULL DEFAULT 'disponible',
  price NUMERIC,
  surface_m2 NUMERIC,
  rooms INTEGER,
  bathrooms INTEGER,
  features JSONB DEFAULT '{}'::jsonb,
  images TEXT[] DEFAULT '{}',
  owner_id UUID,
  agent_id UUID,
  source_url TEXT,
  source_portal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_properties_tenant_status ON public.properties(tenant_id, status);
CREATE INDEX idx_properties_zone ON public.properties(tenant_id, zone);
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view properties" ON public.properties FOR SELECT USING (public.is_member_of_tenant(auth.uid(), tenant_id));
CREATE POLICY "Members can insert properties" ON public.properties FOR INSERT WITH CHECK (public.is_member_of_tenant(auth.uid(), tenant_id));
CREATE POLICY "Members can update properties" ON public.properties FOR UPDATE USING (public.is_member_of_tenant(auth.uid(), tenant_id));
CREATE POLICY "Admins/directors can delete properties" ON public.properties FOR DELETE USING (public.has_role(auth.uid(), tenant_id, 'admin') OR public.has_role(auth.uid(), tenant_id, 'director'));
CREATE TRIGGER properties_set_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- VISITS
CREATE TABLE public.visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  agent_id UUID NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 45,
  status TEXT NOT NULL DEFAULT 'programada',
  notes TEXT,
  outcome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_visits_tenant_date ON public.visits(tenant_id, scheduled_at);
CREATE INDEX idx_visits_agent ON public.visits(agent_id, scheduled_at);
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view visits" ON public.visits FOR SELECT USING (public.is_member_of_tenant(auth.uid(), tenant_id));
CREATE POLICY "Members can insert visits" ON public.visits FOR INSERT WITH CHECK (public.is_member_of_tenant(auth.uid(), tenant_id));
CREATE POLICY "Members can update visits" ON public.visits FOR UPDATE USING (public.is_member_of_tenant(auth.uid(), tenant_id));
CREATE POLICY "Members can delete visits" ON public.visits FOR DELETE USING (public.is_member_of_tenant(auth.uid(), tenant_id));
CREATE TRIGGER visits_set_updated_at BEFORE UPDATE ON public.visits FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TASKS
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pendiente',
  priority TEXT NOT NULL DEFAULT 'media',
  assigned_to UUID,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasks_tenant_status ON public.tasks(tenant_id, status);
CREATE INDEX idx_tasks_assigned ON public.tasks(assigned_to);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view tasks" ON public.tasks FOR SELECT USING (public.is_member_of_tenant(auth.uid(), tenant_id));
CREATE POLICY "Members can insert tasks" ON public.tasks FOR INSERT WITH CHECK (public.is_member_of_tenant(auth.uid(), tenant_id));
CREATE POLICY "Members can update tasks" ON public.tasks FOR UPDATE USING (public.is_member_of_tenant(auth.uid(), tenant_id));
CREATE POLICY "Members can delete tasks" ON public.tasks FOR DELETE USING (public.is_member_of_tenant(auth.uid(), tenant_id));
CREATE TRIGGER tasks_set_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- PARTE B: Buscador de portales (Oportunidades)
-- =====================================================

CREATE TABLE public.scraper_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  portals TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'queued',
  progress JSONB DEFAULT '{}'::jsonb,
  results_count INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_scraper_jobs_tenant ON public.scraper_jobs(tenant_id, created_at DESC);
ALTER TABLE public.scraper_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view scraper jobs" ON public.scraper_jobs FOR SELECT USING (public.is_member_of_tenant(auth.uid(), tenant_id));
CREATE POLICY "Members can create scraper jobs" ON public.scraper_jobs FOR INSERT WITH CHECK (public.is_member_of_tenant(auth.uid(), tenant_id) AND user_id = auth.uid());
CREATE POLICY "Members can update scraper jobs" ON public.scraper_jobs FOR UPDATE USING (public.is_member_of_tenant(auth.uid(), tenant_id));
CREATE TRIGGER scraper_jobs_set_updated_at BEFORE UPDATE ON public.scraper_jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.scraper_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.scraper_jobs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  portal TEXT NOT NULL,
  external_id TEXT NOT NULL,
  url TEXT,
  title TEXT,
  price NUMERIC,
  surface_m2 NUMERIC,
  rooms INTEGER,
  bathrooms INTEGER,
  property_type TEXT,
  operation TEXT,
  address TEXT,
  zone TEXT,
  city TEXT,
  lat NUMERIC,
  lng NUMERIC,
  listing_type TEXT,
  images TEXT[] DEFAULT '{}',
  description TEXT,
  published_at TIMESTAMPTZ,
  raw JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, portal, external_id)
);
CREATE INDEX idx_scraper_results_job ON public.scraper_results(job_id);
CREATE INDEX idx_scraper_results_tenant ON public.scraper_results(tenant_id, created_at DESC);
ALTER TABLE public.scraper_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view scraper results" ON public.scraper_results FOR SELECT USING (public.is_member_of_tenant(auth.uid(), tenant_id));
CREATE POLICY "Members can insert scraper results" ON public.scraper_results FOR INSERT WITH CHECK (public.is_member_of_tenant(auth.uid(), tenant_id));

CREATE TABLE public.saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  portals TEXT[] NOT NULL DEFAULT '{}',
  schedule TEXT,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_saved_searches_user ON public.saved_searches(user_id);
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view saved searches" ON public.saved_searches FOR SELECT USING (public.is_member_of_tenant(auth.uid(), tenant_id));
CREATE POLICY "Users can create their saved searches" ON public.saved_searches FOR INSERT WITH CHECK (public.is_member_of_tenant(auth.uid(), tenant_id) AND user_id = auth.uid());
CREATE POLICY "Users can update their saved searches" ON public.saved_searches FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their saved searches" ON public.saved_searches FOR DELETE USING (user_id = auth.uid());
CREATE TRIGGER saved_searches_set_updated_at BEFORE UPDATE ON public.saved_searches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Aceptación de términos del scraper
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS scraper_terms_accepted_at TIMESTAMPTZ;

-- Realtime
ALTER TABLE public.scraper_jobs REPLICA IDENTITY FULL;
ALTER TABLE public.scraper_results REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scraper_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scraper_results;

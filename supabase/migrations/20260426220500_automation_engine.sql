-- =====================================================
-- Automation engine: persisted rules, runs and execution
-- =====================================================

CREATE TABLE IF NOT EXISTS public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger TEXT NOT NULL CHECK (trigger IN (
    'lead_created',
    'lead_no_response_24h',
    'lead_no_response_72h',
    'visit_completed',
    'lead_dormant_15d',
    'document_pending'
  )),
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  runs_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_tenant_trigger
  ON public.automation_rules(tenant_id, trigger)
  WHERE enabled = true;

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view automation rules"
ON public.automation_rules FOR SELECT
USING (public.is_member_of_tenant(auth.uid(), tenant_id));

CREATE POLICY "Automation managers can insert rules"
ON public.automation_rules FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), tenant_id, 'admin')
  OR public.has_role(auth.uid(), tenant_id, 'director')
  OR public.has_role(auth.uid(), tenant_id, 'super_admin')
);

CREATE POLICY "Automation managers can update rules"
ON public.automation_rules FOR UPDATE
USING (
  public.has_role(auth.uid(), tenant_id, 'admin')
  OR public.has_role(auth.uid(), tenant_id, 'director')
  OR public.has_role(auth.uid(), tenant_id, 'super_admin')
)
WITH CHECK (
  public.has_role(auth.uid(), tenant_id, 'admin')
  OR public.has_role(auth.uid(), tenant_id, 'director')
  OR public.has_role(auth.uid(), tenant_id, 'super_admin')
);

CREATE POLICY "Automation managers can delete rules"
ON public.automation_rules FOR DELETE
USING (
  public.has_role(auth.uid(), tenant_id, 'admin')
  OR public.has_role(auth.uid(), tenant_id, 'director')
  OR public.has_role(auth.uid(), tenant_id, 'super_admin')
);

DROP TRIGGER IF EXISTS automation_rules_set_updated_at ON public.automation_rules;
CREATE TRIGGER automation_rules_set_updated_at
BEFORE UPDATE ON public.automation_rules
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  visit_id UUID REFERENCES public.visits(id) ON DELETE SET NULL,
  trigger_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'ok', 'error')),
  log TEXT[] NOT NULL DEFAULT '{}',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (rule_id, trigger_key)
);

CREATE INDEX IF NOT EXISTS idx_automation_runs_tenant_started
  ON public.automation_runs(tenant_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_runs_rule
  ON public.automation_runs(rule_id, started_at DESC);

ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view automation runs"
ON public.automation_runs FOR SELECT
USING (public.is_member_of_tenant(auth.uid(), tenant_id));

CREATE OR REPLACE FUNCTION public.automation_rule_matches(_conditions JSONB, _lead public.leads)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  cond JSONB;
  field_name TEXT;
  op_name TEXT;
  expected TEXT;
  actual TEXT;
BEGIN
  IF _conditions IS NULL OR jsonb_array_length(_conditions) = 0 THEN
    RETURN true;
  END IF;

  FOR cond IN SELECT value FROM jsonb_array_elements(_conditions) LOOP
    field_name := cond ->> 'field';
    op_name := COALESCE(cond ->> 'op', '=');
    expected := COALESCE(cond ->> 'value', '');

    actual := CASE field_name
      WHEN 'status' THEN COALESCE(_lead.status, '')
      WHEN 'source' THEN COALESCE(_lead.source, '')
      WHEN 'assigned_to' THEN COALESCE(_lead.assigned_to::TEXT, '')
      WHEN 'score' THEN COALESCE(_lead.score::TEXT, '')
      ELSE COALESCE(_lead.interests ->> field_name, '')
    END;

    IF op_name IN ('=', 'eq') AND actual <> expected THEN
      RETURN false;
    ELSIF op_name IN ('!=', 'neq') AND actual = expected THEN
      RETURN false;
    ELSIF op_name = 'contains' AND position(lower(expected) in lower(actual)) = 0 THEN
      RETURN false;
    ELSIF op_name = 'not_contains' AND position(lower(expected) in lower(actual)) > 0 THEN
      RETURN false;
    ELSIF op_name = 'in' AND NOT (actual = ANY(string_to_array(expected, ','))) THEN
      RETURN false;
    END IF;
  END LOOP;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.execute_automation_rule(
  _rule public.automation_rules,
  _lead public.leads,
  _trigger_key TEXT,
  _visit_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  run_id UUID;
  step JSONB;
  step_kind TEXT;
  step_config JSONB;
  logs TEXT[] := ARRAY[]::TEXT[];
  task_type TEXT;
  task_title TEXT;
  task_priority TEXT;
  due_hours INTEGER;
  new_status TEXT;
  target_agent UUID;
BEGIN
  IF NOT _rule.enabled THEN
    RETURN NULL;
  END IF;

  IF NOT public.automation_rule_matches(_rule.conditions, _lead) THEN
    RETURN NULL;
  END IF;

  SELECT id INTO run_id
  FROM public.automation_runs
  WHERE rule_id = _rule.id AND trigger_key = _trigger_key
  LIMIT 1;

  IF run_id IS NOT NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.automation_runs (
    tenant_id, rule_id, lead_id, visit_id, trigger_key, status, payload
  )
  VALUES (
    _rule.tenant_id,
    _rule.id,
    _lead.id,
    _visit_id,
    _trigger_key,
    'running',
    jsonb_build_object('trigger', _rule.trigger, 'leadName', _lead.name)
  )
  RETURNING id INTO run_id;

  BEGIN
    IF jsonb_array_length(COALESCE(_rule.steps, '[]'::jsonb)) = 0 THEN
      logs := logs || 'Regla sin acciones configuradas';
    END IF;

    FOR step IN SELECT value FROM jsonb_array_elements(COALESCE(_rule.steps, '[]'::jsonb)) LOOP
      step_kind := step ->> 'kind';
      step_config := COALESCE(step -> 'config', '{}'::jsonb);

      IF step_kind = 'create_task' THEN
        task_type := COALESCE(NULLIF(step_config ->> 'type', ''), 'seguimiento');
        task_title := COALESCE(NULLIF(step_config ->> 'title', ''), 'Seguimiento automático: ' || _lead.name);
        task_priority := COALESCE(NULLIF(step_config ->> 'priority', ''), 'media');
        due_hours := COALESCE(NULLIF(step_config ->> 'dueInHours', '')::INTEGER, 2);

        INSERT INTO public.tasks (
          tenant_id, title, description, status, priority, assigned_to, lead_id, due_at, created_by
        )
        VALUES (
          _rule.tenant_id,
          task_title,
          format('[%s] Generada por automatización: %s', task_type, _rule.name),
          'pendiente',
          task_priority,
          _lead.assigned_to,
          _lead.id,
          now() + make_interval(hours => due_hours),
          _rule.created_by
        );

        logs := logs || ('Tarea creada: ' || task_title);

      ELSIF step_kind = 'change_status' THEN
        new_status := NULLIF(step_config ->> 'to', '');
        IF new_status IS NOT NULL THEN
          UPDATE public.leads
          SET status = new_status, last_activity_at = now(), updated_at = now()
          WHERE id = _lead.id;
          logs := logs || ('Estado cambiado a ' || new_status);
        ELSE
          logs := logs || 'Cambio de estado omitido: sin estado destino';
        END IF;

      ELSIF step_kind = 'notify_agent' THEN
        INSERT INTO public.lead_activity (tenant_id, lead_id, type, payload, created_by)
        VALUES (
          _rule.tenant_id,
          _lead.id,
          'automation_notification',
          jsonb_build_object('ruleId', _rule.id, 'ruleName', _rule.name, 'message', COALESCE(step_config ->> 'message', 'Revisar lead')),
          _rule.created_by
        );
        logs := logs || 'Notificación registrada';

      ELSIF step_kind = 'send_template' THEN
        INSERT INTO public.lead_activity (tenant_id, lead_id, type, payload, created_by)
        VALUES (
          _rule.tenant_id,
          _lead.id,
          'automation_message',
          jsonb_build_object(
            'ruleId', _rule.id,
            'ruleName', _rule.name,
            'channel', COALESCE(step_config ->> 'channel', 'whatsapp'),
            'templateId', step_config ->> 'templateId',
            'delivery', 'logged'
          ),
          _rule.created_by
        );
        logs := logs || ('Mensaje registrado por ' || COALESCE(step_config ->> 'channel', 'whatsapp'));

      ELSIF step_kind = 'assign_agent' THEN
        target_agent := NULL;
        IF COALESCE(step_config ->> 'agentId', '') ~* '^[0-9a-f-]{36}$' THEN
          target_agent := (step_config ->> 'agentId')::UUID;
        END IF;

        IF target_agent IS NOT NULL THEN
          UPDATE public.leads
          SET assigned_to = target_agent, last_activity_at = now(), updated_at = now()
          WHERE id = _lead.id;
          logs := logs || 'Agente asignado';
        ELSE
          logs := logs || 'Asignación omitida: sin agente válido';
        END IF;

      ELSIF step_kind = 'wait' THEN
        logs := logs || ('Espera registrada: ' || COALESCE(step_config ->> 'hours', '0') || 'h');

      ELSE
        logs := logs || ('Acción no reconocida: ' || COALESCE(step_kind, 'desconocida'));
      END IF;
    END LOOP;

    UPDATE public.automation_runs
    SET status = 'ok', log = logs, finished_at = now()
    WHERE id = run_id;

    UPDATE public.automation_rules
    SET runs_count = runs_count + 1, last_run_at = now(), updated_at = now()
    WHERE id = _rule.id;

    RETURN run_id;
  EXCEPTION WHEN OTHERS THEN
    UPDATE public.automation_runs
    SET status = 'error', log = logs || SQLERRM, error = SQLERRM, finished_at = now()
    WHERE id = run_id;
    RETURN run_id;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.run_lead_created_automations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rule_row public.automation_rules%ROWTYPE;
BEGIN
  FOR rule_row IN
    SELECT *
    FROM public.automation_rules
    WHERE tenant_id = NEW.tenant_id
      AND enabled = true
      AND trigger = 'lead_created'
  LOOP
    PERFORM public.execute_automation_rule(
      rule_row,
      NEW,
      'lead:' || NEW.id::TEXT || ':lead_created',
      NULL
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_run_created_automations ON public.leads;
CREATE TRIGGER leads_run_created_automations
AFTER INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.run_lead_created_automations();

CREATE OR REPLACE FUNCTION public.run_visit_completed_automations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rule_row public.automation_rules%ROWTYPE;
  lead_row public.leads%ROWTYPE;
BEGIN
  IF NEW.lead_id IS NULL
     OR NEW.status <> 'realizada'
     OR COALESCE(OLD.status, '') = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT * INTO lead_row FROM public.leads WHERE id = NEW.lead_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  FOR rule_row IN
    SELECT *
    FROM public.automation_rules
    WHERE tenant_id = NEW.tenant_id
      AND enabled = true
      AND trigger = 'visit_completed'
  LOOP
    PERFORM public.execute_automation_rule(
      rule_row,
      lead_row,
      'visit:' || NEW.id::TEXT || ':visit_completed',
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS visits_run_completed_automations ON public.visits;
CREATE TRIGGER visits_run_completed_automations
AFTER UPDATE OF status ON public.visits
FOR EACH ROW EXECUTE FUNCTION public.run_visit_completed_automations();

CREATE OR REPLACE FUNCTION public.process_due_automations(_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rule_row public.automation_rules%ROWTYPE;
  lead_row public.leads%ROWTYPE;
  trigger_key TEXT;
  run_uuid UUID;
  processed INTEGER := 0;
BEGIN
  IF _tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id_required';
  END IF;

  IF auth.uid() IS NOT NULL AND NOT public.is_member_of_tenant(auth.uid(), _tenant_id) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  FOR rule_row IN
    SELECT *
    FROM public.automation_rules
    WHERE tenant_id = _tenant_id
      AND enabled = true
      AND trigger IN ('lead_no_response_24h', 'lead_no_response_72h', 'lead_dormant_15d', 'document_pending')
  LOOP
    FOR lead_row IN
      SELECT *
      FROM public.leads l
      WHERE l.tenant_id = _tenant_id
        AND (
          (rule_row.trigger = 'lead_no_response_24h' AND l.status = 'contactado' AND l.last_activity_at <= now() - interval '24 hours')
          OR (rule_row.trigger = 'lead_no_response_72h' AND l.status = 'contactado' AND l.last_activity_at <= now() - interval '72 hours')
          OR (rule_row.trigger = 'lead_dormant_15d' AND l.status NOT IN ('perdido', 'descartado', 'ganado') AND l.last_activity_at <= now() - interval '15 days')
          OR (rule_row.trigger = 'document_pending' AND COALESCE(l.tags, '{}'::TEXT[]) && ARRAY['documentacion', 'documentacion_pendiente', 'docs_pendientes']::TEXT[])
        )
    LOOP
      trigger_key := 'lead:' || lead_row.id::TEXT || ':' || rule_row.trigger;
      run_uuid := public.execute_automation_rule(rule_row, lead_row, trigger_key, NULL);
      IF run_uuid IS NOT NULL THEN
        processed := processed + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('processed', processed);
END;
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_rules TO authenticated;
GRANT SELECT ON public.automation_runs TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_due_automations(UUID) TO authenticated, service_role;

ALTER TABLE public.automation_rules REPLICA IDENTITY FULL;
ALTER TABLE public.automation_runs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.automation_rules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.automation_runs;

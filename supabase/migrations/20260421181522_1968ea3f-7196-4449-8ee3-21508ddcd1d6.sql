-- Invitations table
CREATE TABLE public.tenant_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'agente',
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','cancelled','expired')),
  invited_by uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenant_invitations_tenant ON public.tenant_invitations(tenant_id);
CREATE INDEX idx_tenant_invitations_email ON public.tenant_invitations(lower(email));
CREATE INDEX idx_tenant_invitations_token ON public.tenant_invitations(token);

ALTER TABLE public.tenant_invitations ENABLE ROW LEVEL SECURITY;

-- Admin/director can view invitations of their tenant
CREATE POLICY "Admins and directors can view invitations"
ON public.tenant_invitations FOR SELECT
USING (
  public.has_role(auth.uid(), tenant_id, 'admin'::public.app_role)
  OR public.has_role(auth.uid(), tenant_id, 'director'::public.app_role)
);

-- Admin/director can create invitations
CREATE POLICY "Admins and directors can create invitations"
ON public.tenant_invitations FOR INSERT
WITH CHECK (
  (
    public.has_role(auth.uid(), tenant_id, 'admin'::public.app_role)
    OR public.has_role(auth.uid(), tenant_id, 'director'::public.app_role)
  )
  AND invited_by = auth.uid()
);

-- Only admins can cancel/update invitations
CREATE POLICY "Admins can update invitations"
ON public.tenant_invitations FOR UPDATE
USING (public.has_role(auth.uid(), tenant_id, 'admin'::public.app_role));

CREATE POLICY "Admins can delete invitations"
ON public.tenant_invitations FOR DELETE
USING (public.has_role(auth.uid(), tenant_id, 'admin'::public.app_role));

-- Trigger for updated_at
CREATE TRIGGER trg_tenant_invitations_updated_at
BEFORE UPDATE ON public.tenant_invitations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Accept invitation function (security definer to bypass RLS safely)
CREATE OR REPLACE FUNCTION public.accept_invitation(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.tenant_invitations%ROWTYPE;
  current_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT email INTO current_email FROM auth.users WHERE id = auth.uid();

  SELECT * INTO inv FROM public.tenant_invitations WHERE token = _token;

  IF inv.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  IF inv.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invitation_not_pending');
  END IF;

  IF inv.expires_at < now() THEN
    UPDATE public.tenant_invitations SET status = 'expired' WHERE id = inv.id;
    RETURN jsonb_build_object('ok', false, 'error', 'invitation_expired');
  END IF;

  IF lower(inv.email) <> lower(current_email) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'email_mismatch');
  END IF;

  -- Create membership (idempotent)
  INSERT INTO public.user_tenants (user_id, tenant_id, is_default)
  VALUES (auth.uid(), inv.tenant_id, false)
  ON CONFLICT DO NOTHING;

  -- Assign role (idempotent)
  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (auth.uid(), inv.tenant_id, inv.role)
  ON CONFLICT DO NOTHING;

  -- Mark accepted
  UPDATE public.tenant_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = inv.id;

  RETURN jsonb_build_object('ok', true, 'tenant_id', inv.tenant_id);
END;
$$;

-- Ensure uniqueness on memberships and roles to keep accept idempotent
CREATE UNIQUE INDEX IF NOT EXISTS user_tenants_user_tenant_uniq
  ON public.user_tenants(user_id, tenant_id);

CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_tenant_role_uniq
  ON public.user_roles(user_id, tenant_id, role);
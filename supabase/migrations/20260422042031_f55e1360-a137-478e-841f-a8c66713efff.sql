
-- One-shot: create super_admin user silvio@silviocosta.net
DO $$
DECLARE
  new_user_id uuid;
  default_tenant_id uuid;
  encrypted_pw text;
BEGIN
  -- Skip if already exists
  SELECT id INTO new_user_id FROM auth.users WHERE email = 'silvio@silviocosta.net';

  IF new_user_id IS NULL THEN
    new_user_id := gen_random_uuid();
    encrypted_pw := crypt('Rivas2021*', gen_salt('bf'));

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_user_id,
      'authenticated',
      'authenticated',
      'silvio@silviocosta.net',
      encrypted_pw,
      now(),
      jsonb_build_object('provider','email','providers',ARRAY['email']),
      jsonb_build_object('full_name','Silvio Costa'),
      now(),
      now(),
      '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      new_user_id,
      jsonb_build_object('sub', new_user_id::text, 'email', 'silvio@silviocosta.net', 'email_verified', true),
      'email',
      new_user_id::text,
      now(), now(), now()
    );
  END IF;

  -- Ensure profile exists (handle_new_user trigger should fire, but be safe)
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new_user_id, 'silvio@silviocosta.net', 'Silvio Costa')
  ON CONFLICT (id) DO NOTHING;

  -- Ensure there is a tenant to host the user. Reuse first tenant or create one.
  SELECT id INTO default_tenant_id FROM public.tenants ORDER BY created_at LIMIT 1;
  IF default_tenant_id IS NULL THEN
    INSERT INTO public.tenants (name, slug)
    VALUES ('Plataforma', 'plataforma')
    RETURNING id INTO default_tenant_id;
  END IF;

  -- Membership
  INSERT INTO public.user_tenants (user_id, tenant_id, is_default)
  VALUES (new_user_id, default_tenant_id, true)
  ON CONFLICT DO NOTHING;

  -- Super admin role (tenant_id required by schema; we use default tenant)
  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (new_user_id, default_tenant_id, 'super_admin'::public.app_role)
  ON CONFLICT DO NOTHING;
END $$;

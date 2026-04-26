-- =====================================================
-- Documents: metadata table + private Supabase Storage bucket
-- =====================================================

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'otro' CHECK (category IN (
    'contrato',
    'reserva',
    'nota_simple',
    'escritura',
    'interno',
    'ficha_comercial',
    'identidad',
    'otro'
  )),
  status TEXT NOT NULL DEFAULT 'subido' CHECK (status IN ('subido', 'procesando', 'listo', 'error')),
  size_bytes BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  uploaded_by UUID NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  summary TEXT,
  extracted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  content_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_tenant_created
  ON public.documents(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_lead
  ON public.documents(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_property
  ON public.documents(property_id) WHERE property_id IS NOT NULL;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view documents"
ON public.documents FOR SELECT
USING (public.is_member_of_tenant(auth.uid(), tenant_id));

CREATE POLICY "Members can insert documents"
ON public.documents FOR INSERT
WITH CHECK (
  public.is_member_of_tenant(auth.uid(), tenant_id)
  AND uploaded_by = auth.uid()
);

CREATE POLICY "Members can update documents"
ON public.documents FOR UPDATE
USING (public.is_member_of_tenant(auth.uid(), tenant_id))
WITH CHECK (public.is_member_of_tenant(auth.uid(), tenant_id));

CREATE POLICY "Members can delete documents"
ON public.documents FOR DELETE
USING (public.is_member_of_tenant(auth.uid(), tenant_id));

DROP TRIGGER IF EXISTS documents_set_updated_at ON public.documents;
CREATE TRIGGER documents_set_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'text/csv',
    'application/json',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

CREATE POLICY "Members can read tenant document files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND public.is_member_of_tenant(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Members can upload tenant document files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND public.is_member_of_tenant(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Members can update tenant document files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'documents'
  AND public.is_member_of_tenant(auth.uid(), ((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'documents'
  AND public.is_member_of_tenant(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Members can delete tenant document files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND public.is_member_of_tenant(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

ALTER TABLE public.documents REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;

-- FIXORA - Remote electronic signatures for income receipts
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.signature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ingreso_id UUID NOT NULL REFERENCES public.income_entries(id) ON DELETE CASCADE,
  ingreso_code TEXT NOT NULL,
  signature_type TEXT NOT NULL CHECK (signature_type IN ('client', 'receiver')),
  token_hash TEXT NOT NULL UNIQUE CHECK (length(token_hash) = 64),
  token_ciphertext TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'expired', 'revoked', 'superseded')),
  expected_signer_name TEXT NOT NULL DEFAULT '',
  expected_signer_document TEXT NOT NULL DEFAULT '',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  signed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  signature_id UUID,
  revoked_by UUID REFERENCES auth.users(id),
  superseded_by UUID,
  CONSTRAINT signature_request_expiration CHECK (expires_at > created_at)
);

CREATE TABLE IF NOT EXISTS public.electronic_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ingreso_id UUID NOT NULL REFERENCES public.income_entries(id) ON DELETE CASCADE,
  signature_request_id UUID NOT NULL UNIQUE REFERENCES public.signature_requests(id) ON DELETE RESTRICT,
  signature_type TEXT NOT NULL CHECK (signature_type IN ('client', 'receiver')),
  signer_name_snapshot TEXT NOT NULL DEFAULT '',
  signer_document_snapshot TEXT NOT NULL DEFAULT '',
  storage_path TEXT NOT NULL UNIQUE,
  image_sha256 TEXT NOT NULL CHECK (length(image_sha256) = 64),
  consent_text TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_current BOOLEAN NOT NULL DEFAULT true,
  superseded_by UUID REFERENCES public.electronic_signatures(id),
  replaced_by UUID REFERENCES auth.users(id),
  replaced_at TIMESTAMPTZ
);

ALTER TABLE public.signature_requests
  DROP CONSTRAINT IF EXISTS signature_requests_signature_id_fkey;
ALTER TABLE public.signature_requests
  ADD CONSTRAINT signature_requests_signature_id_fkey
  FOREIGN KEY (signature_id) REFERENCES public.electronic_signatures(id) ON DELETE SET NULL;
ALTER TABLE public.signature_requests
  DROP CONSTRAINT IF EXISTS signature_requests_superseded_by_fkey;
ALTER TABLE public.signature_requests
  ADD CONSTRAINT signature_requests_superseded_by_fkey
  FOREIGN KEY (superseded_by) REFERENCES public.signature_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_signature_requests_ingreso ON public.signature_requests(ingreso_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_business ON public.signature_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_status ON public.signature_requests(status);
CREATE INDEX IF NOT EXISTS idx_signature_requests_entry_type ON public.signature_requests(ingreso_id, signature_type);
CREATE UNIQUE INDEX IF NOT EXISTS uq_signature_request_pending
  ON public.signature_requests(ingreso_id, signature_type)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_electronic_signatures_entry ON public.electronic_signatures(ingreso_id, signature_type);
CREATE INDEX IF NOT EXISTS idx_electronic_signatures_business ON public.electronic_signatures(business_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_current_electronic_signature
  ON public.electronic_signatures(ingreso_id, signature_type)
  WHERE is_current;

ALTER TABLE public.signature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.electronic_signatures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own signature requests" ON public.signature_requests;
CREATE POLICY "Users view own signature requests" ON public.signature_requests
  FOR SELECT TO authenticated USING (auth.uid() = business_id);
DROP POLICY IF EXISTS "Users view own electronic signatures" ON public.electronic_signatures;
CREATE POLICY "Users view own electronic signatures" ON public.electronic_signatures
  FOR SELECT TO authenticated USING (auth.uid() = business_id);

-- All mutations pass through Edge Functions. No anon/authenticated insert/update policies.
REVOKE ALL ON public.signature_requests FROM anon;
REVOKE ALL ON public.electronic_signatures FROM anon;
GRANT SELECT ON public.signature_requests, public.electronic_signatures TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('signatures', 'signatures', false, 1048576, ARRAY['image/png'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users read own electronic signatures" ON storage.objects;
CREATE POLICY "Users read own electronic signatures" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'signatures' AND split_part(name, '/', 1) = auth.uid()::text
  );

-- Atomic single-use completion, callable only by the service role used in signature-public.
CREATE OR REPLACE FUNCTION public.complete_electronic_signature(
  p_request_id UUID,
  p_storage_path TEXT,
  p_image_sha256 TEXT,
  p_consent_text TEXT,
  p_consent_version TEXT,
  p_ip_address INET,
  p_user_agent TEXT
) RETURNS public.electronic_signatures
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.signature_requests%ROWTYPE;
  v_signature public.electronic_signatures%ROWTYPE;
BEGIN
  SELECT * INTO v_request FROM public.signature_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR v_request.status <> 'pending' OR v_request.expires_at <= now() THEN
    RAISE EXCEPTION 'signature_request_not_available';
  END IF;

  UPDATE public.electronic_signatures
  SET is_current = false, replaced_at = now(), replaced_by = v_request.created_by
  WHERE ingreso_id = v_request.ingreso_id AND signature_type = v_request.signature_type AND is_current;

  INSERT INTO public.electronic_signatures (
    business_id, ingreso_id, signature_request_id, signature_type,
    signer_name_snapshot, signer_document_snapshot, storage_path, image_sha256,
    consent_text, consent_version, signed_at, ip_address, user_agent
  ) VALUES (
    v_request.business_id, v_request.ingreso_id, v_request.id, v_request.signature_type,
    v_request.expected_signer_name, v_request.expected_signer_document, p_storage_path, p_image_sha256,
    p_consent_text, p_consent_version, now(), p_ip_address, left(coalesce(p_user_agent, ''), 500)
  ) RETURNING * INTO v_signature;

  UPDATE public.signature_requests
  SET status = 'signed', signed_at = v_signature.signed_at, used_at = now(), signature_id = v_signature.id
  WHERE id = v_request.id;
  RETURN v_signature;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_electronic_signature(UUID, TEXT, TEXT, TEXT, TEXT, INET, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_electronic_signature(UUID, TEXT, TEXT, TEXT, TEXT, INET, TEXT) TO service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE public.signature_requests;

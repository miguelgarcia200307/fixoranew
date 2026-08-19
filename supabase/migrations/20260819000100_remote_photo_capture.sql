-- FIXORA - Secure remote photo capture by QR
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE public.income_entry_photos
  ALTER COLUMN income_entry_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS draft_id UUID,
  ADD COLUMN IF NOT EXISTS capture_session_id UUID,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'attached',
  ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS image_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_path TEXT,
  ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.sync_income_entry_photo_defaults()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  NEW.user_id := COALESCE(NEW.user_id, auth.uid());
  IF NEW.user_id IS NULL THEN RAISE EXCEPTION 'photo_owner_required'; END IF;
  IF NEW.income_entry_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM income_entries e WHERE e.id=NEW.income_entry_id AND e.user_id=NEW.user_id) THEN
      RAISE EXCEPTION 'invalid_income_photo_owner';
    END IF;
  ELSIF NEW.draft_id IS NULL OR NEW.status <> 'staged' THEN
    RAISE EXCEPTION 'invalid_photo_context';
  END IF;
  RETURN NEW;
END $$;

DO $$ BEGIN
  ALTER TABLE public.income_entry_photos ADD CONSTRAINT income_photo_status_check
    CHECK (status IN ('staged','attached','deleted'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.income_entry_photos ADD CONSTRAINT income_photo_origin_check
    CHECK (origin IN ('local','camera','gallery','mobile_qr'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.income_entry_photos ADD CONSTRAINT income_photo_context_check
    CHECK (
      (status = 'staged' AND draft_id IS NOT NULL AND income_entry_id IS NULL)
      OR (status = 'attached' AND income_entry_id IS NOT NULL AND draft_id IS NULL)
      OR status = 'deleted'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.photo_capture_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  ingreso_id UUID REFERENCES public.income_entries(id) ON DELETE CASCADE,
  draft_id UUID,
  ingreso_code TEXT,
  section TEXT NOT NULL DEFAULT 'photos' CHECK (section = 'photos'),
  token_hash TEXT NOT NULL UNIQUE,
  token_ciphertext TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','receiving','completed','expired','revoked','superseded','failed')),
  photo_count INTEGER NOT NULL DEFAULT 0 CHECK (photo_count BETWEEN 0 AND 12),
  max_photos INTEGER NOT NULL DEFAULT 12 CHECK (max_photos BETWEEN 1 AND 12),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  superseded_by UUID,
  user_agent TEXT DEFAULT '',
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT photo_capture_context_check CHECK (
    (ingreso_id IS NOT NULL AND draft_id IS NULL) OR
    (ingreso_id IS NULL AND draft_id IS NOT NULL)
  )
);

DO $$ BEGIN
  ALTER TABLE public.photo_capture_sessions ADD CONSTRAINT photo_capture_superseded_fk
    FOREIGN KEY (superseded_by) REFERENCES public.photo_capture_sessions(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.income_entry_photos ADD CONSTRAINT income_photo_capture_session_fk
    FOREIGN KEY (capture_session_id) REFERENCES public.photo_capture_sessions(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.photo_upload_reservations (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.photo_capture_sessions(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'Otra',
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','deleted','failed')),
  mime_type TEXT NOT NULL,
  expected_size BIGINT NOT NULL CHECK (expected_size BETWEEN 1 AND 3145728),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_photo_capture_active_ingreso
  ON public.photo_capture_sessions (business_id, ingreso_id)
  WHERE ingreso_id IS NOT NULL AND status IN ('pending','receiving');
CREATE UNIQUE INDEX IF NOT EXISTS uq_photo_capture_active_draft
  ON public.photo_capture_sessions (business_id, draft_id)
  WHERE draft_id IS NOT NULL AND status IN ('pending','receiving');
CREATE INDEX IF NOT EXISTS idx_photo_capture_business ON public.photo_capture_sessions(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photo_capture_expiry ON public.photo_capture_sessions(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_income_photos_draft ON public.income_entry_photos(user_id, draft_id) WHERE draft_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_income_photo_session_hash
  ON public.income_entry_photos(capture_session_id, image_sha256)
  WHERE capture_session_id IS NOT NULL AND image_sha256 IS NOT NULL AND status <> 'deleted';

ALTER TABLE public.photo_capture_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_upload_reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners read photo capture sessions" ON public.photo_capture_sessions;
CREATE POLICY "Owners read photo capture sessions" ON public.photo_capture_sessions
  FOR SELECT TO authenticated USING (auth.uid() = business_id);
DROP POLICY IF EXISTS "Owners read photo upload reservations" ON public.photo_upload_reservations;
CREATE POLICY "Owners read photo upload reservations" ON public.photo_upload_reservations
  FOR SELECT TO authenticated USING (auth.uid() = business_id);
REVOKE ALL ON public.photo_capture_sessions, public.photo_upload_reservations FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.photo_capture_sessions, public.photo_upload_reservations FROM authenticated;
GRANT SELECT ON public.photo_capture_sessions, public.photo_upload_reservations TO authenticated;

CREATE OR REPLACE FUNCTION public.attach_draft_photos_to_ingreso(p_draft_id UUID, p_ingreso_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid UUID := auth.uid(); v_count INTEGER;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM income_entries WHERE id=p_ingreso_id AND user_id=v_uid) THEN
    RAISE EXCEPTION 'invalid_ingreso';
  END IF;
  IF EXISTS (SELECT 1 FROM income_entry_photos WHERE draft_id=p_draft_id AND user_id<>v_uid) THEN
    RAISE EXCEPTION 'invalid_draft';
  END IF;
  UPDATE income_entry_photos
     SET income_entry_id=p_ingreso_id, draft_id=NULL, status='attached'
   WHERE draft_id=p_draft_id AND user_id=v_uid AND income_entry_id IS NULL AND status='staged';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  UPDATE photo_capture_sessions SET ingreso_id=p_ingreso_id, draft_id=NULL, ingreso_code=(SELECT code FROM income_entries WHERE id=p_ingreso_id), updated_at=now()
   WHERE draft_id=p_draft_id AND business_id=v_uid;
  RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.attach_draft_photos_to_ingreso(UUID,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attach_draft_photos_to_ingreso(UUID,UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_photo_capture_draft(p_draft_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_uid UUID:=auth.uid(); v_count INTEGER;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  UPDATE photo_capture_sessions SET status='revoked',revoked_at=now(),revoked_by=v_uid,updated_at=now()
   WHERE business_id=v_uid AND draft_id=p_draft_id AND status IN ('pending','receiving');
  UPDATE income_entry_photos SET status='deleted',deleted_at=now()
   WHERE user_id=v_uid AND draft_id=p_draft_id AND status='staged';
  GET DIAGNOSTICS v_count=ROW_COUNT; RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.cancel_photo_capture_draft(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_photo_capture_draft(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.cleanup_remote_photo_captures()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,storage AS $$
DECLARE v_expired INTEGER; v_deleted INTEGER;
BEGIN
  UPDATE public.photo_capture_sessions SET status='expired',updated_at=now()
   WHERE status IN ('pending','receiving') AND expires_at<now();
  GET DIAGNOSTICS v_expired=ROW_COUNT;
  WITH doomed AS (
    UPDATE public.income_entry_photos SET status='deleted',deleted_at=now()
     WHERE status='staged' AND created_at<now()-interval '48 hours' RETURNING file_path,thumbnail_path
  ), paths AS (SELECT file_path p FROM doomed UNION ALL SELECT thumbnail_path FROM doomed WHERE thumbnail_path IS NOT NULL)
  DELETE FROM storage.objects o USING paths WHERE o.bucket_id='income-entry-photos' AND o.name=paths.p;
  GET DIAGNOSTICS v_deleted=ROW_COUNT;
  DELETE FROM storage.objects o WHERE o.bucket_id='income-entry-photos'
    AND o.name LIKE '%/remote/%' AND o.created_at<now()-interval '6 hours'
    AND NOT EXISTS (SELECT 1 FROM public.income_entry_photos p WHERE p.file_path=o.name OR p.thumbnail_path=o.name);
  DELETE FROM public.photo_upload_reservations WHERE status IN ('pending','failed','deleted') AND created_at<now()-interval '6 hours';
  RETURN jsonb_build_object('expired_sessions',v_expired,'deleted_objects',v_deleted);
END $$;
REVOKE ALL ON FUNCTION public.cleanup_remote_photo_captures() FROM PUBLIC;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.photo_capture_sessions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- pg_cron is optional on self-hosted projects; schedule when available.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    PERFORM cron.schedule('fixora-photo-cleanup','17 * * * *','SELECT public.cleanup_remote_photo_captures()');
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

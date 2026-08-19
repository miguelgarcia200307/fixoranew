-- FIXORA - Safe administrative deletion of erroneous income entries
CREATE TABLE IF NOT EXISTS public.storage_cleanup_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  income_entry_id UUID NOT NULL,
  bucket_id TEXT NOT NULL,
  object_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','cleaned','failed')),
  error_message TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cleaned_at TIMESTAMPTZ,
  UNIQUE (bucket_id, object_path)
);

ALTER TABLE public.storage_cleanup_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.storage_cleanup_queue FROM anon, authenticated;
GRANT ALL ON public.storage_cleanup_queue TO service_role;
CREATE INDEX IF NOT EXISTS storage_cleanup_pending_idx
  ON public.storage_cleanup_queue(status, created_at) WHERE status <> 'cleaned';

CREATE OR REPLACE FUNCTION public.delete_income_entries_admin(p_business_id UUID, p_income_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  v_requested INTEGER;
  v_owned INTEGER;
  v_deleted INTEGER;
  v_objects JSONB;
BEGIN
  v_requested := COALESCE(array_length(p_income_ids, 1), 0);
  IF p_business_id IS NULL OR v_requested < 1 OR v_requested > 50 THEN
    RAISE EXCEPTION 'invalid_delete_request';
  END IF;

  SELECT count(*) INTO v_owned
    FROM income_entries
   WHERE user_id=p_business_id AND id=ANY(p_income_ids);
  IF v_owned <> v_requested THEN RAISE EXCEPTION 'income_not_owned'; END IF;

  INSERT INTO storage_cleanup_queue(business_id,income_entry_id,bucket_id,object_path)
  SELECT p_business_id,p.id,'income-entry-photos',p.file_path
    FROM income_entry_photos p
   WHERE p.user_id=p_business_id AND p.income_entry_id=ANY(p_income_ids) AND p.file_path<>''
  ON CONFLICT(bucket_id,object_path) DO NOTHING;

  INSERT INTO storage_cleanup_queue(business_id,income_entry_id,bucket_id,object_path)
  SELECT p_business_id,s.ingreso_id,'signatures',s.storage_path
    FROM electronic_signatures s
   WHERE s.business_id=p_business_id AND s.ingreso_id=ANY(p_income_ids) AND s.storage_path<>''
  ON CONFLICT(bucket_id,object_path) DO NOTHING;

  DELETE FROM repair_technical_entries WHERE business_id=p_business_id AND income_entry_id=ANY(p_income_ids);
  DELETE FROM repair_status_history WHERE business_id=p_business_id AND income_entry_id=ANY(p_income_ids);
  DELETE FROM repair_assignments_history WHERE business_id=p_business_id AND income_entry_id=ANY(p_income_ids);
  DELETE FROM electronic_signatures WHERE business_id=p_business_id AND ingreso_id=ANY(p_income_ids);
  DELETE FROM signature_requests WHERE business_id=p_business_id AND ingreso_id=ANY(p_income_ids);
  DELETE FROM income_entries WHERE user_id=p_business_id AND id=ANY(p_income_ids);
  GET DIAGNOSTICS v_deleted=ROW_COUNT;
  IF v_deleted <> v_requested THEN RAISE EXCEPTION 'delete_incomplete'; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',q.id,'bucket',q.bucket_id,'path',q.object_path)),'[]'::jsonb)
    INTO v_objects
    FROM storage_cleanup_queue q
   WHERE q.business_id=p_business_id AND q.income_entry_id=ANY(p_income_ids) AND q.status='pending';

  RETURN jsonb_build_object('deleted_count',v_deleted,'objects',v_objects);
END $$;

REVOKE ALL ON FUNCTION public.delete_income_entries_admin(UUID,UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_income_entries_admin(UUID,UUID[]) TO service_role;

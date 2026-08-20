-- FIXORA public repair tracking. income_entries remains the repair source of truth.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE public.income_entries DROP CONSTRAINT IF EXISTS income_entries_status_check;
UPDATE public.income_entries SET status = 'waiting_authorization' WHERE status = 'awaiting_authorization';
UPDATE public.income_entries SET status = 'waiting_part' WHERE status = 'awaiting_part';
UPDATE public.income_entries SET status = 'finished' WHERE status = 'ready';
ALTER TABLE public.income_entries ADD CONSTRAINT income_entries_status_check CHECK (status IN (
  'received','assigned','diagnosing','waiting_customer','waiting_authorization','waiting_part',
  'repairing','testing','finished','ready_for_delivery','delivered','cancelled'
));
ALTER TABLE public.income_entries ADD COLUMN IF NOT EXISTS status_version bigint NOT NULL DEFAULT 1;

ALTER TABLE public.business_config ADD COLUMN IF NOT EXISTS tracking_intake_template text NOT NULL DEFAULT E'Hola, {{cliente_nombre}}.\n\nHemos registrado el ingreso de tu equipo en {{negocio_nombre}}.\n\nCódigo del ingreso: {{codigo_ingreso}}\nDispositivo: {{dispositivo}}\nMotivo del ingreso o servicio solicitado: {{servicio_solicitado}}\nEstado actual: {{estado_actual}}\n\nPuedes consultar en cualquier momento el estado de la reparación, sus avances y las fotografías autorizadas desde el siguiente enlace:\n\n{{enlace_seguimiento}}\n\nConserva este enlace para futuras consultas.';
ALTER TABLE public.business_config ADD COLUMN IF NOT EXISTS tracking_update_template text NOT NULL DEFAULT E'Hola, {{cliente_nombre}}.\n\nTenemos una actualización sobre el equipo con código {{codigo_ingreso}}.\n\nEstado actual: {{estado_actual}}\nActualización: {{descripcion_actualizacion}}\n\nConsulta el seguimiento completo y las fotografías aquí:\n\n{{enlace_seguimiento}}';
ALTER TABLE public.business_config ADD COLUMN IF NOT EXISTS tracking_finished_template text NOT NULL DEFAULT E'Hola, {{cliente_nombre}}.\n\nTu equipo con código {{codigo_ingreso}} ha finalizado el proceso de reparación y se encuentra listo para continuar con la entrega.\n\nPuedes consultar los detalles y avances aquí:\n\n{{enlace_seguimiento}}';
ALTER TABLE public.business_config ADD COLUMN IF NOT EXISTS tracking_retention_days integer CHECK (tracking_retention_days IS NULL OR tracking_retention_days IN (30,90,180));
ALTER TABLE public.business_config ADD COLUMN IF NOT EXISTS tracking_show_model boolean NOT NULL DEFAULT true;
ALTER TABLE public.business_config ADD COLUMN IF NOT EXISTS tracking_show_masked_serial boolean NOT NULL DEFAULT false;
ALTER TABLE public.business_config ADD COLUMN IF NOT EXISTS tracking_show_photos boolean NOT NULL DEFAULT true;
ALTER TABLE public.business_config ADD COLUMN IF NOT EXISTS tracking_contact_phone text NOT NULL DEFAULT '';
ALTER TABLE public.business_config ADD COLUMN IF NOT EXISTS tracking_footer text NOT NULL DEFAULT 'Seguimiento seguro proporcionado por Fixora.';

CREATE TABLE IF NOT EXISTS public.repair_tracking_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  income_entry_id uuid NOT NULL REFERENCES public.income_entries(id) ON DELETE RESTRICT,
  token_hash text NOT NULL UNIQUE CHECK (length(token_hash)=64),
  token_ciphertext text NOT NULL,
  channel_key text NOT NULL UNIQUE,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked','superseded','expired')),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  expires_at timestamptz,
  last_accessed_at timestamptz,
  access_count bigint NOT NULL DEFAULT 0 CHECK (access_count >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS repair_tracking_one_active_idx ON public.repair_tracking_links(income_entry_id) WHERE status='active';
CREATE INDEX IF NOT EXISTS repair_tracking_business_idx ON public.repair_tracking_links(business_id,income_entry_id,created_at DESC);

CREATE TABLE IF NOT EXISTS public.repair_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  income_entry_id uuid NOT NULL REFERENCES public.income_entries(id) ON DELETE RESTRICT,
  technician_id uuid REFERENCES public.technicians(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status_code text NOT NULL CHECK (status_code IN ('received','assigned','diagnosing','waiting_customer','waiting_authorization','waiting_part','repairing','testing','finished','ready_for_delivery','delivered','cancelled')),
  public_title text NOT NULL DEFAULT '',
  public_description text NOT NULL DEFAULT '',
  internal_note text NOT NULL DEFAULT '',
  visible_to_customer boolean NOT NULL DEFAULT true,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz,
  notification_opened_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_correction boolean NOT NULL DEFAULT false,
  corrects_update_id uuid REFERENCES public.repair_updates(id) ON DELETE RESTRICT,
  status_version bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS repair_updates_entry_idx ON public.repair_updates(income_entry_id,occurred_at DESC,id DESC);

CREATE TABLE IF NOT EXISTS public.repair_update_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  repair_update_id uuid NOT NULL REFERENCES public.repair_updates(id) ON DELETE RESTRICT,
  income_entry_id uuid NOT NULL REFERENCES public.income_entries(id) ON DELETE RESTRICT,
  bucket_id text NOT NULL DEFAULT 'repair-progress',
  storage_path text NOT NULL UNIQUE,
  thumbnail_path text,
  caption text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  visible_to_customer boolean NOT NULL DEFAULT false,
  mime_type text NOT NULL,
  file_size bigint NOT NULL CHECK (file_size BETWEEN 1 AND 5242880),
  width integer,
  height integer,
  image_sha256 text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS repair_update_photos_update_idx ON public.repair_update_photos(repair_update_id,sort_order);

CREATE TABLE IF NOT EXISTS public.repair_photo_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  income_entry_id uuid NOT NULL REFERENCES public.income_entries(id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE,
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp')),
  expected_size bigint NOT NULL CHECK (expected_size BETWEEN 1 AND 5242880),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','attached','expired')),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes')
);

CREATE TABLE IF NOT EXISTS public.whatsapp_notification_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  income_entry_id uuid NOT NULL REFERENCES public.income_entries(id) ON DELETE RESTRICT,
  repair_update_id uuid REFERENCES public.repair_updates(id) ON DELETE RESTRICT,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  phone_snapshot text NOT NULL,
  message_snapshot text NOT NULL,
  notification_type text NOT NULL CHECK (notification_type IN ('intake','update','finished')),
  initiated_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  initiated_at timestamptz NOT NULL DEFAULT now(),
  channel text NOT NULL DEFAULT 'whatsapp_link' CHECK (channel='whatsapp_link'),
  status text NOT NULL DEFAULT 'prepared' CHECK (status IN ('opened','prepared'))
);
CREATE INDEX IF NOT EXISTS whatsapp_attempts_entry_idx ON public.whatsapp_notification_attempts(income_entry_id,initiated_at DESC);

CREATE TABLE IF NOT EXISTS public.repair_update_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status_code text NOT NULL,
  device_type text NOT NULL DEFAULT '',
  description text NOT NULL CHECK (length(trim(description)) > 0),
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS repair_templates_lookup_idx ON public.repair_update_templates(business_id,status_code,device_type,sort_order);

INSERT INTO public.repair_update_templates(status_code,device_type,description,sort_order) VALUES
 ('diagnosing','','El equipo se encuentra en proceso de diagnóstico.',10),
 ('diagnosing','','Estamos realizando pruebas para identificar el origen de la falla.',20),
 ('waiting_customer','','El diagnóstico fue realizado y estamos esperando la respuesta del cliente para continuar.',10),
 ('waiting_authorization','','El diagnóstico fue completado y estamos esperando autorización para iniciar la reparación.',10),
 ('waiting_part','','El repuesto necesario fue solicitado al proveedor.',10),
 ('repairing','','Se inició la reparación del equipo.',10),
 ('testing','','La reparación fue realizada y el equipo se encuentra en pruebas.',10),
 ('finished','','La reparación fue completada y el equipo superó las pruebas realizadas.',10),
 ('ready_for_delivery','','El equipo se encuentra listo para ser recogido.',10),
 ('delivered','','El equipo fue entregado al cliente.',10),
 ('diagnosing','laptop','Verificando pantalla, teclado y panel táctil.',10),
 ('diagnosing','laptop','Comprobando batería y sistema de carga.',20),
 ('diagnosing','desktop','Comprobando memoria RAM y almacenamiento.',10),
 ('diagnosing','phone','Verificando pantalla y respuesta táctil.',10),
 ('diagnosing','smartwatch','Realizando pruebas de conectividad y sincronización.',10)
ON CONFLICT DO NOTHING;

ALTER TABLE public.repair_tracking_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_update_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_photo_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_notification_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_update_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY tracking_admin_read ON public.repair_tracking_links FOR SELECT USING (public.is_business_admin(business_id));
CREATE POLICY updates_staff_read ON public.repair_updates FOR SELECT USING (
  public.is_business_admin(business_id) OR EXISTS (SELECT 1 FROM public.income_entries e WHERE e.id=income_entry_id AND e.technician_id=public.active_technician_id(business_id))
);
CREATE POLICY update_photos_staff_read ON public.repair_update_photos FOR SELECT USING (
  public.is_business_admin(business_id) OR EXISTS (SELECT 1 FROM public.income_entries e WHERE e.id=income_entry_id AND e.technician_id=public.active_technician_id(business_id))
);
CREATE POLICY whatsapp_admin_read ON public.whatsapp_notification_attempts FOR SELECT USING (public.is_business_admin(business_id));
CREATE POLICY templates_staff_read ON public.repair_update_templates FOR SELECT USING (business_id IS NULL OR public.is_business_admin(business_id) OR public.active_technician_id(business_id) IS NOT NULL);
CREATE POLICY templates_admin_all ON public.repair_update_templates FOR ALL USING (business_id IS NOT NULL AND public.is_business_admin(business_id)) WITH CHECK (business_id IS NOT NULL AND public.is_business_admin(business_id));

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('repair-progress','repair-progress',false,5242880,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=5242880,allowed_mime_types=EXCLUDED.allowed_mime_types;

CREATE POLICY repair_progress_staff_read ON storage.objects FOR SELECT USING (
  bucket_id='repair-progress' AND auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.income_entries e
    WHERE e.user_id::text=split_part(name,'/',1) AND e.id::text=split_part(name,'/',2)
      AND (public.is_business_admin(e.user_id) OR e.technician_id=public.active_technician_id(e.user_id))
  )
);

-- Assignment remains an auditable public event without exposing the technician identity.
CREATE OR REPLACE FUNCTION public.track_repair_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.technician_id IS DISTINCT FROM OLD.technician_id AND NEW.technician_id IS NOT NULL THEN
    INSERT INTO repair_updates(business_id,income_entry_id,technician_id,created_by,status_code,public_title,public_description,visible_to_customer,status_version)
    VALUES(NEW.user_id,NEW.id,NEW.technician_id,coalesce(auth.uid(),NEW.updated_by,NEW.user_id),'assigned','Asignado','El equipo fue asignado al personal técnico responsable.',true,NEW.status_version+1);
    NEW.status_version := NEW.status_version + 1;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trigger_track_repair_assignment ON public.income_entries;
CREATE TRIGGER trigger_track_repair_assignment BEFORE UPDATE OF technician_id ON public.income_entries FOR EACH ROW EXECUTE FUNCTION public.track_repair_assignment();

CREATE OR REPLACE FUNCTION public.publish_repair_update(
  p_income_entry_id uuid,
  p_status_code text,
  p_public_title text,
  p_public_description text,
  p_internal_note text,
  p_visible_to_customer boolean,
  p_expected_version bigint,
  p_photos jsonb DEFAULT '[]'::jsonb
) RETURNS public.repair_updates
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,storage AS $$
DECLARE
  v_entry public.income_entries;
  v_update public.repair_updates;
  v_tech uuid;
  v_admin boolean;
  v_allowed text[];
  v_photo jsonb;
  v_upload public.repair_photo_uploads;
BEGIN
  SELECT * INTO v_entry FROM public.income_entries WHERE id=p_income_entry_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reparación no encontrada'; END IF;
  v_admin := public.is_business_admin(v_entry.user_id);
  v_tech := public.active_technician_id(v_entry.user_id);
  IF NOT v_admin AND (v_tech IS NULL OR v_entry.technician_id IS DISTINCT FROM v_tech) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF p_expected_version IS DISTINCT FROM v_entry.status_version THEN RAISE EXCEPTION 'El estado cambió en otra sesión. Actualiza e inténtalo nuevamente.'; END IF;
  IF p_status_code NOT IN ('received','assigned','diagnosing','waiting_customer','waiting_authorization','waiting_part','repairing','testing','finished','ready_for_delivery','delivered','cancelled') THEN RAISE EXCEPTION 'Estado no válido'; END IF;
  IF NOT v_admin AND p_status_code IN ('received','assigned','ready_for_delivery','delivered','cancelled') THEN RAISE EXCEPTION 'Transición reservada al administrador'; END IF;
  v_allowed := CASE v_entry.status
    WHEN 'received' THEN ARRAY['received','assigned','diagnosing','cancelled']
    WHEN 'assigned' THEN ARRAY['assigned','diagnosing','cancelled']
    WHEN 'diagnosing' THEN ARRAY['diagnosing','waiting_customer','waiting_authorization','waiting_part','repairing','testing','finished','cancelled']
    WHEN 'waiting_customer' THEN ARRAY['waiting_customer','diagnosing','waiting_authorization','waiting_part','repairing','cancelled']
    WHEN 'waiting_authorization' THEN ARRAY['waiting_authorization','waiting_customer','waiting_part','repairing','cancelled']
    WHEN 'waiting_part' THEN ARRAY['waiting_part','repairing','testing','cancelled']
    WHEN 'repairing' THEN ARRAY['repairing','waiting_customer','waiting_part','testing','finished','cancelled']
    WHEN 'testing' THEN ARRAY['testing','repairing','waiting_part','finished','cancelled']
    WHEN 'finished' THEN ARRAY['finished','testing','ready_for_delivery','cancelled']
    WHEN 'ready_for_delivery' THEN ARRAY['ready_for_delivery','delivered','cancelled']
    WHEN 'delivered' THEN ARRAY['delivered']
    ELSE ARRAY[v_entry.status]
  END;
  IF NOT v_admin AND NOT (p_status_code=ANY(v_allowed)) THEN RAISE EXCEPTION 'Transición de estado no permitida'; END IF;
  IF p_visible_to_customer AND length(trim(coalesce(p_public_description,''))) < 3 THEN RAISE EXCEPTION 'La descripción pública es obligatoria'; END IF;

  INSERT INTO public.repair_updates(business_id,income_entry_id,technician_id,created_by,status_code,public_title,public_description,internal_note,visible_to_customer,is_correction,status_version)
  VALUES(v_entry.user_id,v_entry.id,v_tech,auth.uid(),p_status_code,left(trim(coalesce(p_public_title,'')),120),left(trim(coalesce(p_public_description,'')),2000),left(trim(coalesce(p_internal_note,'')),4000),coalesce(p_visible_to_customer,true),v_admin AND NOT (p_status_code=ANY(v_allowed)),v_entry.status_version+1)
  RETURNING * INTO v_update;

  FOR v_photo IN SELECT value FROM jsonb_array_elements(coalesce(p_photos,'[]'::jsonb)) LOOP
    SELECT * INTO v_upload FROM public.repair_photo_uploads
    WHERE id=(v_photo->>'upload_id')::uuid AND business_id=v_entry.user_id AND income_entry_id=v_entry.id
      AND created_by=auth.uid() AND status='pending' AND expires_at>now() FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Una fotografía ya no está disponible'; END IF;
    IF NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='repair-progress' AND o.name=v_upload.storage_path) THEN RAISE EXCEPTION 'Una fotografía no terminó de cargar'; END IF;
    INSERT INTO public.repair_update_photos(business_id,repair_update_id,income_entry_id,storage_path,caption,sort_order,visible_to_customer,mime_type,file_size,created_by)
    VALUES(v_entry.user_id,v_update.id,v_entry.id,v_upload.storage_path,left(coalesce(v_photo->>'caption',''),300),greatest(0,coalesce((v_photo->>'sort_order')::integer,0)),coalesce((v_photo->>'visible_to_customer')::boolean,false),v_upload.mime_type,v_upload.expected_size,auth.uid());
    UPDATE public.repair_photo_uploads SET status='attached' WHERE id=v_upload.id;
  END LOOP;

  UPDATE public.income_entries SET status=p_status_code,status_version=status_version+1,
    completed_at=CASE WHEN p_status_code IN ('finished','ready_for_delivery') THEN coalesce(completed_at,now()) ELSE completed_at END
  WHERE id=v_entry.id;
  INSERT INTO public.repair_status_history(business_id,income_entry_id,previous_status,new_status,comment,changed_by)
  VALUES(v_entry.user_id,v_entry.id,v_entry.status,p_status_code,left(trim(coalesce(p_internal_note,p_public_description,'')),1000),auth.uid());
  IF p_status_code='delivered' THEN
    UPDATE public.repair_tracking_links l SET expires_at=CASE WHEN c.tracking_retention_days IS NULL THEN NULL ELSE now()+make_interval(days=>c.tracking_retention_days) END
    FROM public.business_config c WHERE l.income_entry_id=v_entry.id AND l.status='active' AND c.user_id=v_entry.user_id;
  END IF;
  RETURN v_update;
END $$;

GRANT SELECT ON public.repair_tracking_links,public.repair_updates,public.repair_update_photos,public.repair_update_templates,public.whatsapp_notification_attempts TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_repair_update(uuid,text,text,text,text,boolean,bigint,jsonb) TO authenticated;

-- Compatibility for older clients that still call the original status RPC.
CREATE OR REPLACE FUNCTION public.change_repair_status(p_income_entry_id uuid,p_new_status text,p_comment text DEFAULT '')
RETURNS public.income_entries LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_entry public.income_entries; v_status text;
BEGIN
  SELECT * INTO v_entry FROM public.income_entries WHERE id=p_income_entry_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reparación no encontrada'; END IF;
  v_status := CASE p_new_status WHEN 'awaiting_authorization' THEN 'waiting_authorization' WHEN 'awaiting_part' THEN 'waiting_part' WHEN 'ready' THEN 'finished' ELSE p_new_status END;
  PERFORM public.publish_repair_update(p_income_entry_id,v_status,initcap(replace(v_status,'_',' ')),coalesce(p_comment,''),coalesce(p_comment,''),true,v_entry.status_version,'[]'::jsonb);
  SELECT * INTO v_entry FROM public.income_entries WHERE id=p_income_entry_id;
  RETURN v_entry;
END $$;
GRANT EXECUTE ON FUNCTION public.change_repair_status(uuid,text,text) TO authenticated;

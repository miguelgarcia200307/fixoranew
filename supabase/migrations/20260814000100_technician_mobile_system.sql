-- FIXORA technician workspace. Existing income_entries are the repair source of truth.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'admin';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_owner_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin','technician'));
UPDATE public.profiles SET business_owner_id = id WHERE business_owner_id IS NULL AND role = 'admin';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.profiles(id,email,business_name,role,business_owner_id,is_active)
  VALUES(NEW.id,NEW.email,COALESCE(NEW.raw_user_meta_data->>'business_name',''),'admin',NEW.id,true)
  ON CONFLICT(id) DO NOTHING;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.is_business_admin(p_business_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles p WHERE p.id=auth.uid() AND p.role='admin' AND p.is_active AND p.business_owner_id=p_business_id)
$$;
CREATE TABLE IF NOT EXISTS public.technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  auth_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE RESTRICT,
  full_name text NOT NULL CHECK (length(trim(full_name)) BETWEEN 2 AND 120),
  document_type text NOT NULL DEFAULT 'CC', document_number text NOT NULL,
  phone text NOT NULL DEFAULT '', email text NOT NULL, specialty text NOT NULL,
  linked_at date NOT NULL DEFAULT CURRENT_DATE, avatar_path text,
  is_active boolean NOT NULL DEFAULT true,
  visibility_scope text NOT NULL DEFAULT 'assigned' CHECK (visibility_scope IN ('assigned','business_read','assigned_unassigned')),
  can_view_client boolean NOT NULL DEFAULT true, can_view_prices boolean NOT NULL DEFAULT false,
  can_view_commission boolean NOT NULL DEFAULT true, can_view_commission_status boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id, document_number), UNIQUE(business_id, email)
);
CREATE INDEX IF NOT EXISTS technicians_business_active_idx ON public.technicians(business_id,is_active);

-- Helpers referencing technicians must be defined after its table.
CREATE OR REPLACE FUNCTION public.active_technician_id(p_business_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT t.id FROM technicians t WHERE t.auth_user_id=auth.uid() AND t.business_id=p_business_id AND t.is_active LIMIT 1
$$;

ALTER TABLE public.income_entries ADD COLUMN IF NOT EXISTS technician_id uuid REFERENCES public.technicians(id) ON DELETE SET NULL;
ALTER TABLE public.income_entries ADD COLUMN IF NOT EXISTS assigned_at timestamptz;
ALTER TABLE public.income_entries ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.income_entries ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal';
ALTER TABLE public.income_entries DROP CONSTRAINT IF EXISTS income_entries_status_check;
UPDATE public.income_entries SET status='diagnosing' WHERE status='in_review';
ALTER TABLE public.income_entries ADD CONSTRAINT income_entries_status_check CHECK (status IN ('received','assigned','diagnosing','awaiting_authorization','awaiting_part','repairing','testing','ready','delivered','cancelled'));
ALTER TABLE public.income_entries DROP CONSTRAINT IF EXISTS income_entries_priority_check;
ALTER TABLE public.income_entries ADD CONSTRAINT income_entries_priority_check CHECK (priority IN ('low','normal','high','urgent'));
CREATE INDEX IF NOT EXISTS income_entries_technician_status_idx ON public.income_entries(technician_id,status);

CREATE TABLE IF NOT EXISTS public.repair_assignments_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 income_entry_id uuid NOT NULL REFERENCES public.income_entries(id) ON DELETE RESTRICT,
 previous_technician_id uuid REFERENCES public.technicians(id) ON DELETE SET NULL,
 technician_id uuid REFERENCES public.technicians(id) ON DELETE SET NULL,
 assigned_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT, reason text NOT NULL DEFAULT '',
 repair_status text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS repair_assignment_entry_idx ON public.repair_assignments_history(income_entry_id,created_at DESC);

CREATE TABLE IF NOT EXISTS public.repair_status_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 income_entry_id uuid NOT NULL REFERENCES public.income_entries(id) ON DELETE RESTRICT,
 previous_status text NOT NULL, new_status text NOT NULL, comment text NOT NULL DEFAULT '',
 changed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS repair_status_entry_idx ON public.repair_status_history(income_entry_id,created_at DESC);

CREATE TABLE IF NOT EXISTS public.repair_technical_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 income_entry_id uuid NOT NULL REFERENCES public.income_entries(id) ON DELETE RESTRICT,
 technician_id uuid NOT NULL REFERENCES public.technicians(id) ON DELETE RESTRICT,
 entry_type text NOT NULL CHECK(entry_type IN ('diagnosis','procedure','part','labor','note')),
 content text NOT NULL CHECK(length(trim(content))>0), created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS repair_technical_entry_idx ON public.repair_technical_entries(income_entry_id,created_at DESC);

CREATE TABLE IF NOT EXISTS public.technician_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 recipient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 income_entry_id uuid REFERENCES public.income_entries(id) ON DELETE CASCADE,
 type text NOT NULL DEFAULT 'info', title text NOT NULL, message text NOT NULL DEFAULT '',
 read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS technician_notifications_recipient_idx ON public.technician_notifications(recipient_user_id,read_at,created_at DESC);

CREATE OR REPLACE FUNCTION public.assign_repair_technician(p_income_entry_id uuid,p_technician_id uuid,p_reason text DEFAULT '')
RETURNS public.income_entries LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_entry public.income_entries; v_old uuid; v_auth uuid;
BEGIN
 SELECT * INTO v_entry FROM income_entries WHERE id=p_income_entry_id FOR UPDATE;
 IF NOT FOUND OR NOT is_business_admin(v_entry.user_id) THEN RAISE EXCEPTION 'No autorizado'; END IF;
 IF p_technician_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM technicians WHERE id=p_technician_id AND business_id=v_entry.user_id AND is_active) THEN RAISE EXCEPTION 'Tecnico no disponible'; END IF;
 v_old:=v_entry.technician_id;
 UPDATE income_entries SET technician_id=p_technician_id, assigned_at=CASE WHEN p_technician_id IS NULL THEN NULL ELSE now() END,
   status=CASE WHEN p_technician_id IS NOT NULL AND status='received' THEN 'assigned' ELSE status END WHERE id=p_income_entry_id RETURNING * INTO v_entry;
 INSERT INTO repair_assignments_history(business_id,income_entry_id,previous_technician_id,technician_id,assigned_by,reason,repair_status)
 VALUES(v_entry.user_id,v_entry.id,v_old,p_technician_id,auth.uid(),left(coalesce(p_reason,''),500),v_entry.status);
 SELECT auth_user_id INTO v_auth FROM technicians WHERE id=p_technician_id;
 IF v_auth IS NOT NULL THEN INSERT INTO technician_notifications(business_id,recipient_user_id,income_entry_id,type,title,message)
 VALUES(v_entry.user_id,v_auth,v_entry.id,'assignment','Nueva reparación asignada',v_entry.code); END IF;
 RETURN v_entry;
END $$;

CREATE OR REPLACE FUNCTION public.change_repair_status(p_income_entry_id uuid,p_new_status text,p_comment text DEFAULT '')
RETURNS public.income_entries LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_entry public.income_entries; v_is_admin boolean; v_tech uuid; v_rank_old int; v_rank_new int;
BEGIN
 SELECT * INTO v_entry FROM income_entries WHERE id=p_income_entry_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Reparacion no encontrada'; END IF;
 v_is_admin:=is_business_admin(v_entry.user_id); v_tech:=active_technician_id(v_entry.user_id);
 IF NOT v_is_admin AND (v_tech IS NULL OR v_entry.technician_id<>v_tech) THEN RAISE EXCEPTION 'No autorizado'; END IF;
 IF NOT v_is_admin AND p_new_status IN ('received','delivered','cancelled') THEN RAISE EXCEPTION 'Transicion reservada al administrador'; END IF;
 IF p_new_status NOT IN ('received','assigned','diagnosing','awaiting_authorization','awaiting_part','repairing','testing','ready','delivered','cancelled') THEN RAISE EXCEPTION 'Estado invalido'; END IF;
 v_rank_old:=array_position(ARRAY['received','assigned','diagnosing','awaiting_authorization','awaiting_part','repairing','testing','ready','delivered'],v_entry.status);
 v_rank_new:=array_position(ARRAY['received','assigned','diagnosing','awaiting_authorization','awaiting_part','repairing','testing','ready','delivered'],p_new_status);
 IF v_rank_new<v_rank_old AND length(trim(coalesce(p_comment,'')))<3 THEN RAISE EXCEPTION 'El motivo es obligatorio al retroceder'; END IF;
 INSERT INTO repair_status_history(business_id,income_entry_id,previous_status,new_status,comment,changed_by)
 VALUES(v_entry.user_id,v_entry.id,v_entry.status,p_new_status,left(coalesce(p_comment,''),1000),auth.uid());
 UPDATE income_entries SET status=p_new_status,completed_at=CASE WHEN p_new_status='ready' THEN coalesce(completed_at,now()) WHEN p_new_status<>'delivered' THEN NULL ELSE completed_at END
 WHERE id=v_entry.id RETURNING * INTO v_entry;
 IF NOT v_is_admin THEN INSERT INTO technician_notifications(business_id,recipient_user_id,income_entry_id,type,title,message)
 VALUES(v_entry.user_id,v_entry.user_id,v_entry.id,CASE WHEN p_new_status='ready' THEN 'completed' ELSE 'status' END,
 CASE WHEN p_new_status='ready' THEN 'Equipo terminado' ELSE 'Estado actualizado' END,v_entry.code); END IF;
 RETURN v_entry;
END $$;

ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_assignments_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_technical_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY technicians_admin_all ON public.technicians FOR ALL USING(is_business_admin(business_id)) WITH CHECK(is_business_admin(business_id));
CREATE POLICY technicians_self_read ON public.technicians FOR SELECT USING(auth_user_id=auth.uid() AND is_active);
CREATE POLICY assignments_visible ON public.repair_assignments_history FOR SELECT USING(is_business_admin(business_id) OR active_technician_id(business_id) IN (technician_id,previous_technician_id));
CREATE POLICY statuses_visible ON public.repair_status_history FOR SELECT USING(is_business_admin(business_id) OR EXISTS(SELECT 1 FROM income_entries e WHERE e.id=income_entry_id AND e.technician_id=active_technician_id(business_id)));
CREATE POLICY technical_entries_visible ON public.repair_technical_entries FOR SELECT USING(is_business_admin(business_id) OR EXISTS(SELECT 1 FROM income_entries e WHERE e.id=income_entry_id AND e.technician_id=active_technician_id(business_id)));
CREATE POLICY technical_entries_tech_insert ON public.repair_technical_entries FOR INSERT WITH CHECK(created_by=auth.uid() AND technician_id=active_technician_id(business_id) AND EXISTS(SELECT 1 FROM income_entries e WHERE e.id=income_entry_id AND e.technician_id=technician_id));
CREATE POLICY notifications_self_read ON public.technician_notifications FOR SELECT USING(recipient_user_id=auth.uid());
CREATE POLICY notifications_self_update ON public.technician_notifications FOR UPDATE USING(recipient_user_id=auth.uid()) WITH CHECK(recipient_user_id=auth.uid());
CREATE POLICY notifications_admin_read ON public.technician_notifications FOR SELECT USING(is_business_admin(business_id));

-- Replace owner-only policies with tenant-aware policies for the repair data used by technicians.
DROP POLICY IF EXISTS "Users can manage own income entries" ON public.income_entries;
CREATE POLICY income_admin_all ON public.income_entries FOR ALL USING(is_business_admin(user_id)) WITH CHECK(is_business_admin(user_id));
CREATE POLICY income_technician_read ON public.income_entries FOR SELECT USING(
 EXISTS(SELECT 1 FROM technicians t WHERE t.business_id=user_id AND t.auth_user_id=auth.uid() AND t.is_active AND
   (technician_id=t.id OR t.visibility_scope='business_read' OR (t.visibility_scope='assigned_unassigned' AND technician_id IS NULL)))
);

CREATE POLICY clients_technician_authorized_read ON public.clients FOR SELECT USING(
 EXISTS(SELECT 1 FROM technicians t WHERE t.business_id=clients.user_id AND t.auth_user_id=auth.uid() AND t.is_active AND t.can_view_client)
 AND EXISTS(SELECT 1 FROM income_entries e WHERE e.client_id=clients.id AND
   EXISTS(SELECT 1 FROM technicians t WHERE t.auth_user_id=auth.uid() AND t.is_active AND
     (e.technician_id=t.id OR t.visibility_scope='business_read' OR (t.visibility_scope='assigned_unassigned' AND e.technician_id IS NULL))))
);

DROP POLICY IF EXISTS "Users can manage own income accessories" ON public.income_entry_accessories;
CREATE POLICY accessories_admin_all ON public.income_entry_accessories FOR ALL USING(is_business_admin(user_id)) WITH CHECK(is_business_admin(user_id));
CREATE POLICY accessories_technician_read ON public.income_entry_accessories FOR SELECT USING(EXISTS(SELECT 1 FROM income_entries e WHERE e.id=income_entry_id));
DROP POLICY IF EXISTS "Users can manage own income photos" ON public.income_entry_photos;
CREATE POLICY photos_admin_all ON public.income_entry_photos FOR ALL USING(is_business_admin(user_id)) WITH CHECK(is_business_admin(user_id));
CREATE POLICY photos_technician_read ON public.income_entry_photos FOR SELECT USING(EXISTS(SELECT 1 FROM income_entries e WHERE e.id=income_entry_id));

GRANT EXECUTE ON FUNCTION public.assign_repair_technician(uuid,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.change_repair_status(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.active_technician_id(uuid) TO authenticated;

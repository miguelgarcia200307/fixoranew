-- ============================================
-- FIXORA - INGRESOS MODULE
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- SEQUENCE / COUNTER
-- ============================================
CREATE TABLE IF NOT EXISTS income_entry_counters (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  next_number BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, year)
);

ALTER TABLE income_entry_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own income counters" ON income_entry_counters;
CREATE POLICY "Users can manage own income counters" ON income_entry_counters
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- INCOME ENTRIES
-- ============================================
CREATE TABLE IF NOT EXISTS income_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  code_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'in_review', 'repairing', 'ready', 'delivered', 'cancelled')),

  device_type TEXT NOT NULL CHECK (device_type IN (
    'desktop',
    'laptop',
    'phone',
    'tablet',
    'smartwatch',
    'console',
    'printer',
    'monitor',
    'other'
  )),
  device_custom_type TEXT DEFAULT '',
  brand TEXT DEFAULT '',
  brand_custom TEXT DEFAULT '',
  model TEXT DEFAULT '',
  color TEXT DEFAULT '',

  serial TEXT DEFAULT '',
  serial_status TEXT NOT NULL DEFAULT 'visible' CHECK (serial_status IN ('visible', 'not_visible', 'not_applicable', 'pending')),
  imei1 TEXT DEFAULT '',
  imei2 TEXT DEFAULT '',

  problem_reported TEXT NOT NULL DEFAULT '',
  physical_condition TEXT[] NOT NULL DEFAULT '{}',
  physical_notes TEXT DEFAULT '',
  identification_notes TEXT DEFAULT '',
  unlock_code_hint TEXT DEFAULT '',
  unlock_code_protected BOOLEAN NOT NULL DEFAULT FALSE,

  specs JSONB NOT NULL DEFAULT '{}'::JSONB,
  accessories_without BOOLEAN NOT NULL DEFAULT FALSE,

  received_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, code)
);

ALTER TABLE income_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own income entries" ON income_entries;
CREATE POLICY "Users can manage own income entries" ON income_entries
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_income_entries_user_id ON income_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_income_entries_user_code ON income_entries(user_id, code);
CREATE INDEX IF NOT EXISTS idx_income_entries_user_client_id ON income_entries(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_income_entries_user_received_at ON income_entries(user_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_income_entries_user_serial ON income_entries(user_id, serial);
CREATE INDEX IF NOT EXISTS idx_income_entries_user_imei1 ON income_entries(user_id, imei1);
CREATE INDEX IF NOT EXISTS idx_income_entries_user_imei2 ON income_entries(user_id, imei2);
CREATE INDEX IF NOT EXISTS idx_income_entries_user_brand_model ON income_entries(user_id, brand, model);

-- ============================================
-- ACCESSORIES
-- ============================================
CREATE TABLE IF NOT EXISTS income_entry_accessories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  income_entry_id UUID NOT NULL REFERENCES income_entries(id) ON DELETE CASCADE,
  accessory_type TEXT NOT NULL DEFAULT 'preset' CHECK (accessory_type IN ('preset', 'custom')),
  name TEXT NOT NULL DEFAULT '',
  custom_name TEXT DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  condition TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE income_entry_accessories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own income accessories" ON income_entry_accessories;
CREATE POLICY "Users can manage own income accessories" ON income_entry_accessories
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_income_entry_accessories_entry_id ON income_entry_accessories(income_entry_id);
CREATE INDEX IF NOT EXISTS idx_income_entry_accessories_user_id ON income_entry_accessories(user_id);

-- ============================================
-- PHOTOS
-- ============================================
CREATE TABLE IF NOT EXISTS income_entry_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  income_entry_id UUID NOT NULL REFERENCES income_entries(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  angle TEXT DEFAULT '',
  description TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT DEFAULT '',
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE income_entry_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own income photos" ON income_entry_photos;
CREATE POLICY "Users can manage own income photos" ON income_entry_photos
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_income_entry_photos_entry_id ON income_entry_photos(income_entry_id);
CREATE INDEX IF NOT EXISTS idx_income_entry_photos_user_id ON income_entry_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_income_entry_photos_primary ON income_entry_photos(income_entry_id, is_primary DESC, sort_order ASC);

-- ============================================
-- HELPERS
-- ============================================
CREATE OR REPLACE FUNCTION public.next_income_entry_number(p_user_id UUID, p_year INTEGER)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_number BIGINT;
BEGIN
  INSERT INTO public.income_entry_counters (user_id, year, next_number, updated_at)
  VALUES (p_user_id, p_year, 1, NOW())
  ON CONFLICT (user_id, year)
  DO UPDATE SET
    next_number = public.income_entry_counters.next_number + 1,
    updated_at = NOW()
  RETURNING next_number INTO v_number;

  RETURN v_number;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_income_entry_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_number BIGINT;
BEGIN
  v_user_id := COALESCE(NEW.user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'auth.uid() is required to create income entries';
  END IF;

  NEW.user_id := v_user_id;
  NEW.created_by := COALESCE(NEW.created_by, auth.uid());
  NEW.updated_by := COALESCE(NEW.updated_by, auth.uid());
  NEW.received_by := COALESCE(NEW.received_by, auth.uid());
  NEW.code_year := COALESCE(NEW.code_year, EXTRACT(YEAR FROM COALESCE(NEW.received_at, NOW()))::INTEGER);
  NEW.received_at := COALESCE(NEW.received_at, NOW());
  NEW.status := COALESCE(NEW.status, 'received');

  IF NEW.client_id IS NOT NULL THEN
    PERFORM 1
    FROM public.clients c
    WHERE c.id = NEW.client_id
      AND c.user_id = v_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Client does not belong to the authenticated user';
    END IF;
  END IF;

  v_number := public.next_income_entry_number(v_user_id, NEW.code_year);
  NEW.code := format('ING-%s-%s', NEW.code_year, lpad(v_number::TEXT, 6, '0'));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_income_entry_defaults ON income_entries;
CREATE TRIGGER trigger_sync_income_entry_defaults
  BEFORE INSERT ON income_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_income_entry_defaults();

CREATE OR REPLACE FUNCTION public.sync_income_entry_touch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  NEW.updated_by := COALESCE(auth.uid(), NEW.updated_by);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_income_entries_touch ON income_entries;
CREATE TRIGGER trigger_income_entries_touch
  BEFORE UPDATE ON income_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_income_entry_touch();

CREATE OR REPLACE FUNCTION public.sync_income_entry_accessory_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.user_id := COALESCE(NEW.user_id, auth.uid());

  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'auth.uid() is required to create accessories';
  END IF;

  PERFORM 1
  FROM public.income_entries e
  WHERE e.id = NEW.income_entry_id
    AND e.user_id = NEW.user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Income entry does not belong to the authenticated user';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_income_entry_accessory_defaults ON income_entry_accessories;
CREATE TRIGGER trigger_income_entry_accessory_defaults
  BEFORE INSERT ON income_entry_accessories
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_income_entry_accessory_defaults();

CREATE OR REPLACE FUNCTION public.sync_income_entry_photo_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.user_id := COALESCE(NEW.user_id, auth.uid());

  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'auth.uid() is required to create photos';
  END IF;

  PERFORM 1
  FROM public.income_entries e
  WHERE e.id = NEW.income_entry_id
    AND e.user_id = NEW.user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Income entry does not belong to the authenticated user';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_income_entry_photo_defaults ON income_entry_photos;
CREATE TRIGGER trigger_income_entry_photo_defaults
  BEFORE INSERT ON income_entry_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_income_entry_photo_defaults();

CREATE OR REPLACE FUNCTION public.touch_income_entry_accessories()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_income_entry_accessories_touch ON income_entry_accessories;
CREATE TRIGGER trigger_income_entry_accessories_touch
  BEFORE UPDATE ON income_entry_accessories
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_income_entry_accessories();

-- ============================================
-- STORAGE BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('income-entry-photos', 'income-entry-photos', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public, name = EXCLUDED.name;

DROP POLICY IF EXISTS "Users can view own income photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own income photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own income photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own income photos" ON storage.objects;

CREATE POLICY "Users can view own income photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'income-entry-photos'
    AND auth.uid() IS NOT NULL
    AND split_part(name, '/', 1) = auth.uid()::TEXT
  );

CREATE POLICY "Users can upload own income photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'income-entry-photos'
    AND auth.uid() IS NOT NULL
    AND split_part(name, '/', 1) = auth.uid()::TEXT
  );

CREATE POLICY "Users can update own income photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'income-entry-photos'
    AND auth.uid() IS NOT NULL
    AND split_part(name, '/', 1) = auth.uid()::TEXT
  );

CREATE POLICY "Users can delete own income photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'income-entry-photos'
    AND auth.uid() IS NOT NULL
    AND split_part(name, '/', 1) = auth.uid()::TEXT
  );

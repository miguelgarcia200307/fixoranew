-- ============================================
-- FIXORA - Database Schema for Supabase
-- ============================================
-- Run this in the Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  business_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- BUSINESS CONFIG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS business_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Business Info
  business_name TEXT DEFAULT '',
  slogan TEXT DEFAULT '',
  nit TEXT DEFAULT '',
  document TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  department TEXT DEFAULT '',
  country TEXT DEFAULT 'Colombia',
  postal_code TEXT DEFAULT '',
  description TEXT DEFAULT '',
  schedule TEXT DEFAULT '',
  
  -- Contact
  phone TEXT DEFAULT '',
  whatsapp TEXT DEFAULT '',
  email TEXT DEFAULT '',
  website TEXT DEFAULT '',
  instagram TEXT DEFAULT '',
  facebook TEXT DEFAULT '',
  tiktok TEXT DEFAULT '',
  
  -- Branding
  logo_url TEXT DEFAULT '',
  color_primary TEXT DEFAULT '#6366f1',
  color_secondary TEXT DEFAULT '#0ea5e9',
  signature_url TEXT DEFAULT '',
  stamp_url TEXT DEFAULT '',
  
  -- Currency & Formatting
  currency TEXT DEFAULT 'COP',
  currency_prefix TEXT DEFAULT '$',
  date_format TEXT DEFAULT 'DD/MM/YYYY',
  timezone TEXT DEFAULT 'America/Bogota',
  
  -- Document Config
  prefix_invoice TEXT DEFAULT 'FAC',
  prefix_quote TEXT DEFAULT 'COT',
  start_number_invoice INTEGER DEFAULT 1,
  start_number_quote INTEGER DEFAULT 1,
  
  -- Taxes
  iva_rate NUMERIC DEFAULT 19,
  retention_rate NUMERIC DEFAULT 2.5,
  
  -- Footer
  footer_message TEXT DEFAULT '',
  policies TEXT DEFAULT '',
  conditions TEXT DEFAULT '',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

ALTER TABLE business_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own config" ON business_config
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- CLIENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  name TEXT DEFAULT '',
  last_name TEXT DEFAULT '',
  company TEXT DEFAULT '',
  document TEXT DEFAULT '',
  nit TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  whatsapp TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  department TEXT DEFAULT '',
  country TEXT DEFAULT '',
  observations TEXT DEFAULT '',
  
  total_invoices INTEGER DEFAULT 0,
  total_quotes INTEGER DEFAULT 0,
  total_purchased NUMERIC DEFAULT 0,
  last_purchase_date TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own clients" ON clients
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_clients_company ON clients(company);
CREATE INDEX idx_clients_document ON clients(document);

-- ============================================
-- DOCUMENTS TABLE (Invoices & Quotes)
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  type TEXT NOT NULL CHECK (type IN ('invoice', 'quote')),
  number TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'cancelled', 'pending')),
  
  -- Client data (denormalized for document integrity)
  client_data JSONB DEFAULT '{}',
  
  -- Items data
  items_data JSONB DEFAULT '[]',
  
  -- Calculations
  observations TEXT DEFAULT '',
  subtotal NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  iva NUMERIC DEFAULT 0,
  retention NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  
  -- Tax flags
  apply_iva BOOLEAN DEFAULT FALSE,
  apply_retention BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own documents" ON documents
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_number ON documents(number);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX idx_documents_client_data ON documents USING gin(client_data);

-- ============================================
-- ACTIVITY LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs" ON activity_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs" ON activity_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  title TEXT NOT NULL,
  message TEXT DEFAULT '',
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  read BOOLEAN DEFAULT FALSE,
  link TEXT DEFAULT '',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notifications" ON notifications
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, business_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'business_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_config_updated_at BEFORE UPDATE ON business_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STORAGE BUCKETS
-- ============================================

INSERT INTO storage.buckets (id, name, public) VALUES
  ('business-logo', 'business-logo', true),
  ('signatures', 'signatures', false),
  ('stamps', 'stamps', false),
  ('generated-documents', 'generated-documents', false),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public access for logo" ON storage.objects
  FOR SELECT USING (bucket_id = 'business-logo');

CREATE POLICY "Users can upload own logo" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'business-logo' AND split_part(name, '/', 1) = auth.uid()::TEXT
  );

CREATE POLICY "Users can update own logo" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'business-logo' AND split_part(name, '/', 1) = auth.uid()::TEXT)
  WITH CHECK (bucket_id = 'business-logo' AND split_part(name, '/', 1) = auth.uid()::TEXT);

CREATE POLICY "Users can delete own logo" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'business-logo' AND split_part(name, '/', 1) = auth.uid()::TEXT);

CREATE POLICY "Public access for avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload avatars" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'avatars' AND split_part(name, '/', 1) = auth.uid()::TEXT
  );

CREATE POLICY "Users can update own avatars" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND split_part(name, '/', 1) = auth.uid()::TEXT)
  WITH CHECK (bucket_id = 'avatars' AND split_part(name, '/', 1) = auth.uid()::TEXT);

CREATE POLICY "Users can delete own avatars" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND split_part(name, '/', 1) = auth.uid()::TEXT);

-- ============================================
-- INCOME ENTRY MODULE
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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

CREATE TABLE IF NOT EXISTS income_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  code_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'in_review', 'repairing', 'ready', 'delivered', 'cancelled')),
  device_type TEXT NOT NULL CHECK (device_type IN ('desktop', 'laptop', 'phone', 'tablet', 'smartwatch', 'console', 'printer', 'monitor', 'other')),
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
    PERFORM 1 FROM public.clients c WHERE c.id = NEW.client_id AND c.user_id = v_user_id;
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

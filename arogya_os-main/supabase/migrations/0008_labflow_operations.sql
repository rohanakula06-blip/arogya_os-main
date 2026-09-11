-- ============================================================================
-- 0008_labflow_operations.sql
-- ArogyaOS LabFlow Diagnostic Operations, Sample Tracking & Result Coordination
-- ============================================================================

-- 1. Collection Centers Table
CREATE TABLE IF NOT EXISTS public.lab_collection_centers (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  in_charge TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Diagnostic Orders Table
CREATE TABLE IF NOT EXISTS public.lab_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  patient_age INT NOT NULL,
  patient_gender TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  patient_email TEXT,
  referring_doctor TEXT,
  collection_center TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'routine' CHECK (priority IN ('routine', 'urgent', 'stat')),
  clinical_history TEXT,
  status TEXT NOT NULL DEFAULT 'order_placed' CHECK (status IN ('order_placed', 'samples_collected', 'in_analysis', 'under_review', 'approved_ready', 'delivered')),
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  payment_status TEXT NOT NULL DEFAULT 'paid',
  tat_target_minutes INT NOT NULL DEFAULT 60,
  critical_alert BOOLEAN NOT NULL DEFAULT FALSE,
  critical_alert_notes TEXT,
  pathologist_sign_off JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Diagnostic Specimens / Samples Table
CREATE TABLE IF NOT EXISTS public.lab_samples (
  id TEXT PRIMARY KEY,
  barcode TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL REFERENCES public.lab_orders(id) ON DELETE CASCADE,
  specimen_type TEXT NOT NULL,
  tube_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ordered' CHECK (status IN ('ordered', 'collected', 'in_transit', 'received_at_lab', 'processing', 'completed', 'rejected', 'repeat_requested')),
  collected_at TIMESTAMPTZ,
  collected_by TEXT,
  collection_center TEXT NOT NULL,
  temperature NUMERIC(4, 1),
  rejection_reason TEXT,
  rejection_notes TEXT,
  repeat_of_sample_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Chain of Custody Audit Events Table (Tamper-evident)
CREATE TABLE IF NOT EXISTS public.lab_chain_of_custody (
  id TEXT PRIMARY KEY,
  sample_barcode TEXT NOT NULL REFERENCES public.lab_samples(barcode) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  location TEXT NOT NULL,
  handler_name TEXT NOT NULL,
  handler_role TEXT NOT NULL,
  notes TEXT,
  temperature_celsius NUMERIC(4, 1),
  hash_signature TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Diagnostic Test Results Table
CREATE TABLE IF NOT EXISTS public.lab_results (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES public.lab_orders(id) ON DELETE CASCADE,
  test_id TEXT NOT NULL,
  test_code TEXT NOT NULL,
  test_name TEXT NOT NULL,
  department TEXT NOT NULL,
  sample_barcode TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  analyzer_used TEXT,
  technician_name TEXT,
  technician_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  parameters JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Quality Control (QC) Calibration Logs
CREATE TABLE IF NOT EXISTS public.lab_qc_logs (
  id TEXT PRIMARY KEY,
  analyzer_id TEXT NOT NULL,
  analyzer_name TEXT NOT NULL,
  department TEXT NOT NULL,
  parameter_name TEXT NOT NULL,
  control_lot TEXT NOT NULL,
  target_mean NUMERIC(10, 4) NOT NULL,
  target_sd NUMERIC(10, 4) NOT NULL,
  measured_value NUMERIC(10, 4) NOT NULL,
  z_score NUMERIC(6, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('in_control', 'warning_1_2s', 'out_of_control_1_3s', 'out_of_control_2_2s')),
  technician TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.lab_collection_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_chain_of_custody ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_qc_logs ENABLE ROW LEVEL SECURITY;

-- Read policies
CREATE POLICY "Allow public read on collection centers" ON public.lab_collection_centers FOR SELECT USING (true);
CREATE POLICY "Allow authenticated full access to orders" ON public.lab_orders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access to samples" ON public.lab_samples FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access to chain of custody" ON public.lab_chain_of_custody FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access to results" ON public.lab_results FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access to qc logs" ON public.lab_qc_logs FOR ALL USING (auth.role() = 'authenticated');

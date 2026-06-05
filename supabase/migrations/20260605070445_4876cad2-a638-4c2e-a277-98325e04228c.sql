
CREATE TABLE public.machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_code TEXT NOT NULL UNIQUE,
  machine_name TEXT NOT NULL,
  line TEXT NOT NULL,
  ideal_cycle_time_seconds NUMERIC NOT NULL CHECK (ideal_cycle_time_seconds > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.machines TO anon, authenticated;
GRANT ALL ON public.machines TO service_role;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read machines"   ON public.machines FOR SELECT USING (true);
CREATE POLICY "Public insert machines" ON public.machines FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update machines" ON public.machines FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete machines" ON public.machines FOR DELETE USING (true);

CREATE TABLE public.production_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  shift TEXT NOT NULL CHECK (shift IN ('A','B','C')),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  planned_time_minutes NUMERIC NOT NULL CHECK (planned_time_minutes >= 0),
  output_qty NUMERIC NOT NULL CHECK (output_qty >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX production_data_date_idx ON public.production_data(date);
CREATE INDEX production_data_machine_idx ON public.production_data(machine_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_data TO anon, authenticated;
GRANT ALL ON public.production_data TO service_role;
ALTER TABLE public.production_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read production"   ON public.production_data FOR SELECT USING (true);
CREATE POLICY "Public insert production" ON public.production_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update production" ON public.production_data FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete production" ON public.production_data FOR DELETE USING (true);

CREATE TABLE public.downtime_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  shift TEXT NOT NULL CHECK (shift IN ('A','B','C')),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  downtime_reason TEXT NOT NULL,
  downtime_minutes NUMERIC NOT NULL CHECK (downtime_minutes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX downtime_data_date_idx ON public.downtime_data(date);
CREATE INDEX downtime_data_machine_idx ON public.downtime_data(machine_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.downtime_data TO anon, authenticated;
GRANT ALL ON public.downtime_data TO service_role;
ALTER TABLE public.downtime_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read downtime"   ON public.downtime_data FOR SELECT USING (true);
CREATE POLICY "Public insert downtime" ON public.downtime_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update downtime" ON public.downtime_data FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete downtime" ON public.downtime_data FOR DELETE USING (true);

CREATE TABLE public.rejection_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  shift TEXT NOT NULL CHECK (shift IN ('A','B','C')),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  reject_qty NUMERIC NOT NULL CHECK (reject_qty >= 0),
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX rejection_data_date_idx ON public.rejection_data(date);
CREATE INDEX rejection_data_machine_idx ON public.rejection_data(machine_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rejection_data TO anon, authenticated;
GRANT ALL ON public.rejection_data TO service_role;
ALTER TABLE public.rejection_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read rejection"   ON public.rejection_data FOR SELECT USING (true);
CREATE POLICY "Public insert rejection" ON public.rejection_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update rejection" ON public.rejection_data FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete rejection" ON public.rejection_data FOR DELETE USING (true);

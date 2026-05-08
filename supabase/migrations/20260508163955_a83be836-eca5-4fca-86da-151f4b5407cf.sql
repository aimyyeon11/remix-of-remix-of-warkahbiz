-- Goals/Impian table for the goal planner (device-scoped, no auth)
CREATE TABLE public.user_impian (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('machine','sales','branch')),
  goal_name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL DEFAULT 0,
  current_saved NUMERIC NOT NULL DEFAULT 0,
  selected_plan JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_impian_device ON public.user_impian (device_id, created_at DESC);

ALTER TABLE public.user_impian ENABLE ROW LEVEL SECURITY;

-- This app has no auth; rows are scoped client-side by device_id.
-- Policies allow public CRUD (matches the existing localStorage-style pattern).
CREATE POLICY "Anyone can read impian" ON public.user_impian FOR SELECT USING (true);
CREATE POLICY "Anyone can create impian" ON public.user_impian FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update impian" ON public.user_impian FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete impian" ON public.user_impian FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_user_impian_updated_at
BEFORE UPDATE ON public.user_impian
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- ─────────────────────────────────────────────────────────
-- 012 – Horário de funcionamento estruturado
-- ─────────────────────────────────────────────────────────

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS open_time  text    DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS close_time text    DEFAULT '23:00',
  ADD COLUMN IF NOT EXISTS open_days  int[]   DEFAULT '{0,1,2,3,4,5,6}';

-- ─────────────────────────────────────────────────────────
-- 010 – Banner promocional configurável
-- ─────────────────────────────────────────────────────────

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS promo_banner_enabled  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS promo_banner_text     text    DEFAULT 'Temos cupons disponíveis! Aproveite nos descontos.',
  ADD COLUMN IF NOT EXISTS promo_banner_bg_color text    DEFAULT '#0EAD69';

-- ═══════════════════════════════════════════════════════════
-- POD HOUSE — 007 Controle de Estoque + Zonas de Entrega
-- ═══════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────
-- 1. CONTROLE DE ESTOQUE - Novos campos em product_variants
-- ─────────────────────────────────────────────────────────
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS cost_price numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_cost  numeric(10,2) DEFAULT 0;


-- ─────────────────────────────────────────────────────────
-- 2. TABELA stock_entries - Histórico de movimentações
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stock_entries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id    uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  type          text NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
  quantity      integer NOT NULL,
  cost_per_unit numeric(10,2),
  notes         text,
  created_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_entries_variant ON public.stock_entries(variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_entries_created ON public.stock_entries(created_at DESC);

-- RLS
ALTER TABLE public.stock_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_entries_admin_all" ON public.stock_entries
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ─────────────────────────────────────────────────────────
-- 3. RPC: Adicionar entrada de estoque com custo médio
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.add_stock_entry(
  p_variant_id  uuid,
  p_type        text,
  p_quantity    integer,
  p_cost_per_unit numeric DEFAULT NULL,
  p_notes       text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_stock integer;
  v_current_avg   numeric(10,2);
  v_new_stock     integer;
  v_new_avg       numeric(10,2);
BEGIN
  -- Validação
  IF p_type NOT IN ('in', 'out', 'adjustment') THEN
    RETURN jsonb_build_object('error', 'Tipo inválido. Use: in, out, adjustment');
  END IF;

  IF p_type = 'in' AND p_quantity <= 0 THEN
    RETURN jsonb_build_object('error', 'Quantidade de entrada deve ser positiva');
  END IF;

  -- Lock da variante
  SELECT stock, avg_cost
  INTO v_current_stock, v_current_avg
  FROM public.product_variants
  WHERE id = p_variant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Variante não encontrada');
  END IF;

  -- Calcular novo estoque
  IF p_type = 'in' THEN
    v_new_stock := v_current_stock + p_quantity;
    -- Custo médio ponderado
    IF p_cost_per_unit IS NOT NULL AND p_cost_per_unit > 0 THEN
      IF v_new_stock > 0 THEN
        v_new_avg := ((v_current_stock * COALESCE(v_current_avg, 0)) + (p_quantity * p_cost_per_unit)) / v_new_stock;
      ELSE
        v_new_avg := p_cost_per_unit;
      END IF;
    ELSE
      v_new_avg := v_current_avg;
    END IF;

    -- Atualizar variante
    UPDATE public.product_variants
    SET stock = v_new_stock,
        avg_cost = ROUND(v_new_avg, 2),
        cost_price = COALESCE(p_cost_per_unit, cost_price)
    WHERE id = p_variant_id;

  ELSIF p_type = 'out' THEN
    v_new_stock := GREATEST(v_current_stock - ABS(p_quantity), 0);
    v_new_avg := v_current_avg;

    UPDATE public.product_variants
    SET stock = v_new_stock
    WHERE id = p_variant_id;

  ELSE -- adjustment
    v_new_stock := p_quantity; -- ajuste define estoque absoluto
    v_new_avg := v_current_avg;

    UPDATE public.product_variants
    SET stock = v_new_stock
    WHERE id = p_variant_id;
  END IF;

  -- Registrar entrada
  INSERT INTO public.stock_entries (variant_id, type, quantity, cost_per_unit, notes, created_by)
  VALUES (p_variant_id, p_type, p_quantity, p_cost_per_unit, p_notes, auth.uid());

  RETURN jsonb_build_object(
    'success', true,
    'new_stock', v_new_stock,
    'new_avg_cost', ROUND(COALESCE(v_new_avg, 0), 2),
    'previous_stock', v_current_stock
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_stock_entry TO authenticated;


-- ─────────────────────────────────────────────────────────
-- 4. ZONAS DE ENTREGA
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.delivery_zones (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  radius_meters     integer NOT NULL,
  delivery_fee      numeric(10,2) NOT NULL DEFAULT 5.00,
  estimated_minutes integer NOT NULL DEFAULT 30,
  color             text NOT NULL DEFAULT '#8B5CF6',
  sort_order        integer NOT NULL DEFAULT 0,
  active            boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delivery_zones_public_select" ON public.delivery_zones
  FOR SELECT USING (true);

CREATE POLICY "delivery_zones_admin_all" ON public.delivery_zones
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ─────────────────────────────────────────────────────────
-- 5. LOCALIZAÇÃO DA LOJA em store_settings
-- ─────────────────────────────────────────────────────────
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS store_lat double precision,
  ADD COLUMN IF NOT EXISTS store_lng double precision,
  ADD COLUMN IF NOT EXISTS store_address text;


-- ─────────────────────────────────────────────────────────
-- 6. RPC: Calcular frete por coordenadas (Haversine)
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_delivery_fee_by_coords(
  p_lat double precision,
  p_lng double precision
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_store_lat double precision;
  v_store_lng double precision;
  v_distance  double precision;
  v_zone      record;
BEGIN
  -- Buscar localização da loja
  SELECT store_lat, store_lng
  INTO v_store_lat, v_store_lng
  FROM public.store_settings
  WHERE id = 'default';

  IF v_store_lat IS NULL OR v_store_lng IS NULL THEN
    RETURN jsonb_build_object('error', 'Localização da loja não configurada');
  END IF;

  -- Haversine: distância em metros
  v_distance := 6371000 * 2 * ASIN(
    SQRT(
      POWER(SIN(RADIANS(p_lat - v_store_lat) / 2), 2) +
      COS(RADIANS(v_store_lat)) * COS(RADIANS(p_lat)) *
      POWER(SIN(RADIANS(p_lng - v_store_lng) / 2), 2)
    )
  );

  -- Encontrar a menor zona que cobre a distância
  SELECT dz.name, dz.delivery_fee, dz.estimated_minutes, dz.radius_meters
  INTO v_zone
  FROM public.delivery_zones dz
  WHERE dz.active = true
    AND dz.radius_meters >= v_distance
  ORDER BY dz.radius_meters ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'error', 'Fora da área de entrega',
      'distance_meters', ROUND(v_distance::numeric, 0)
    );
  END IF;

  RETURN jsonb_build_object(
    'zone_name', v_zone.name,
    'delivery_fee', v_zone.delivery_fee,
    'estimated_minutes', v_zone.estimated_minutes,
    'distance_meters', ROUND(v_distance::numeric, 0),
    'radius_meters', v_zone.radius_meters
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_delivery_fee_by_coords TO authenticated, anon;


-- ─────────────────────────────────────────────────────────
-- 7. RLS para store_settings (se não existir)
-- ─────────────────────────────────────────────────────────
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_settings_public_select" ON public.store_settings;
CREATE POLICY "store_settings_public_select" ON public.store_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "store_settings_admin_all" ON public.store_settings;
CREATE POLICY "store_settings_admin_all" ON public.store_settings
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Bucket para store assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-assets', 'store-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "store_assets_public_select" ON storage.objects;
CREATE POLICY "store_assets_public_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'store-assets');

DROP POLICY IF EXISTS "store_assets_admin_insert" ON storage.objects;
CREATE POLICY "store_assets_admin_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'store-assets' AND public.is_admin());

DROP POLICY IF EXISTS "store_assets_admin_update" ON storage.objects;
CREATE POLICY "store_assets_admin_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'store-assets' AND public.is_admin())
  WITH CHECK (bucket_id = 'store-assets' AND public.is_admin());

DROP POLICY IF EXISTS "store_assets_admin_delete" ON storage.objects;
CREATE POLICY "store_assets_admin_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'store-assets' AND public.is_admin());


-- ═══════════════════════════════════════════════════════════
-- FIM DA MIGRATION 007
-- ═══════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────
-- 009 – Campos extras em store_settings
-- ─────────────────────────────────────────────────────────

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS whatsapp_number         text          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS phone_number            text          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS address_display         text          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS opening_hours           text          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS min_order_value         numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_info           text          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_open                 boolean       DEFAULT true,
  -- Taxa padrão quando o CEP está fora de todas as zonas cadastradas
  ADD COLUMN IF NOT EXISTS default_delivery_fee    numeric(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS default_delivery_minutes integer       DEFAULT 60;

-- Atualiza RPC para retornar taxa padrão quando fora das zonas
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
  v_store_lat              double precision;
  v_store_lng              double precision;
  v_distance               double precision;
  v_zone                   record;
  v_default_fee            numeric(10,2);
  v_default_minutes        integer;
BEGIN
  SELECT store_lat, store_lng
  INTO v_store_lat, v_store_lng
  FROM public.store_settings
  WHERE id = 'default';

  IF v_store_lat IS NULL OR v_store_lng IS NULL THEN
    RETURN jsonb_build_object('error', 'Localização da loja não configurada');
  END IF;

  -- Distância em metros (Haversine)
  v_distance := 6371000 * 2 * ASIN(
    SQRT(
      POWER(SIN(RADIANS(p_lat - v_store_lat) / 2), 2) +
      COS(RADIANS(v_store_lat)) * COS(RADIANS(p_lat)) *
      POWER(SIN(RADIANS(p_lng - v_store_lng) / 2), 2)
    )
  );

  -- 1. Zonas com polígono têm prioridade; fallback: raio
  SELECT dz.name, dz.delivery_fee, dz.estimated_minutes, dz.sort_order
  INTO v_zone
  FROM public.delivery_zones dz
  WHERE dz.active = true
    AND (
      (dz.polygon IS NOT NULL AND public.point_in_polygon(p_lat, p_lng, dz.polygon))
      OR
      (dz.polygon IS NULL AND dz.radius_meters IS NOT NULL AND dz.radius_meters >= v_distance)
    )
  ORDER BY
    CASE WHEN dz.polygon IS NOT NULL THEN 0 ELSE 1 END,
    dz.sort_order ASC,
    dz.delivery_fee ASC
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'zone_name',         v_zone.name,
      'delivery_fee',      v_zone.delivery_fee,
      'estimated_minutes', v_zone.estimated_minutes,
      'distance_meters',   ROUND(v_distance::numeric, 0),
      'is_default',        false
    );
  END IF;

  -- 2. Fora de todas as zonas → verifica taxa padrão
  SELECT default_delivery_fee, default_delivery_minutes
  INTO v_default_fee, v_default_minutes
  FROM public.store_settings
  WHERE id = 'default';

  IF v_default_fee IS NOT NULL THEN
    RETURN jsonb_build_object(
      'zone_name',         'Fora da área',
      'delivery_fee',      v_default_fee,
      'estimated_minutes', COALESCE(v_default_minutes, 60),
      'distance_meters',   ROUND(v_distance::numeric, 0),
      'is_default',        true
    );
  END IF;

  -- 3. Sem zona e sem padrão → erro
  RETURN jsonb_build_object(
    'error',           'Fora da área de entrega',
    'distance_meters', ROUND(v_distance::numeric, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_delivery_fee_by_coords TO authenticated, anon;

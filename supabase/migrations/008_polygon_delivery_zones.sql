-- ─────────────────────────────────────────────────────────
-- 008 – Zonas de entrega por polígono
-- ─────────────────────────────────────────────────────────

-- 1. Coluna polygon (array de [lat, lng]) e fonte do polígono
ALTER TABLE public.delivery_zones
  ADD COLUMN IF NOT EXISTS polygon jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS polygon_source text DEFAULT NULL;

-- 2. Helper: ponto dentro de polígono (ray casting)
--    polygon: [[lat0,lng0],[lat1,lng1],...]
CREATE OR REPLACE FUNCTION public.point_in_polygon(
  p_lat     double precision,
  p_lng     double precision,
  p_polygon jsonb
)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  n      integer;
  i      integer;
  j      integer;
  lat_i  double precision;
  lng_i  double precision;
  lat_j  double precision;
  lng_j  double precision;
  inside boolean := false;
BEGIN
  n := jsonb_array_length(p_polygon);
  IF n < 3 THEN RETURN false; END IF;
  j := n - 1;
  FOR i IN 0..n-1 LOOP
    lat_i := (p_polygon -> i -> 0)::double precision;
    lng_i := (p_polygon -> i -> 1)::double precision;
    lat_j := (p_polygon -> j -> 0)::double precision;
    lng_j := (p_polygon -> j -> 1)::double precision;
    IF (lat_i > p_lat) != (lat_j > p_lat) THEN
      IF p_lng < (lng_j - lng_i) * (p_lat - lat_i) / (lat_j - lat_i) + lng_i THEN
        inside := NOT inside;
      END IF;
    END IF;
    j := i;
  END LOOP;
  RETURN inside;
END;
$$;

GRANT EXECUTE ON FUNCTION public.point_in_polygon TO authenticated, anon;

-- 3. Atualizar RPC: verifica polígono primeiro, raio como fallback
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

  -- Zonas com polígono têm prioridade; fallback: raio
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

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'error', 'Fora da área de entrega',
      'distance_meters', ROUND(v_distance::numeric, 0)
    );
  END IF;

  RETURN jsonb_build_object(
    'zone_name',          v_zone.name,
    'delivery_fee',       v_zone.delivery_fee,
    'estimated_minutes',  v_zone.estimated_minutes,
    'distance_meters',    ROUND(v_distance::numeric, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_delivery_fee_by_coords TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════
-- POD HOUSE — 006 RLS Completo + Campo description variantes
-- ═══════════════════════════════════════════════════════════
-- Garante que TODAS as tabelas tenham RLS habilitado,
-- policies corretas para admin/cliente/público,
-- e storage configurado para uploads de imagem.
-- ═══════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────
-- 0. NOVO CAMPO: description nas variantes de produto
-- ─────────────────────────────────────────────────────────
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS description TEXT;


-- ─────────────────────────────────────────────────────────
-- 1. PROFILES
-- ─────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Limpar policies antigas
DROP POLICY IF EXISTS "admins_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: leitura própria" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: update próprio" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: insert no signup" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: admin full" ON public.profiles;
DROP POLICY IF EXISTS "users_own_profile_select" ON public.profiles;
DROP POLICY IF EXISTS "users_own_profile_update" ON public.profiles;
DROP POLICY IF EXISTS "users_insert_own_profile" ON public.profiles;

-- Novas policies
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own_or_admin" ON public.profiles
  FOR UPDATE USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE USING (public.is_admin());


-- ─────────────────────────────────────────────────────────
-- 2. ADDRESSES
-- ─────────────────────────────────────────────────────────
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Addresses: próprias" ON public.addresses;
DROP POLICY IF EXISTS "users_own_addresses" ON public.addresses;

CREATE POLICY "addresses_own_or_admin" ON public.addresses
  FOR ALL USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());


-- ─────────────────────────────────────────────────────────
-- 3. NEIGHBORHOODS
-- ─────────────────────────────────────────────────────────
ALTER TABLE public.neighborhoods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_neighborhoods_all" ON public.neighborhoods;
DROP POLICY IF EXISTS "Neighborhoods: leitura pública" ON public.neighborhoods;
DROP POLICY IF EXISTS "Neighborhoods: admin gerencia" ON public.neighborhoods;
DROP POLICY IF EXISTS "neighborhoods_public_read" ON public.neighborhoods;

CREATE POLICY "neighborhoods_public_select" ON public.neighborhoods
  FOR SELECT USING (true);

CREATE POLICY "neighborhoods_admin_all" ON public.neighborhoods
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ─────────────────────────────────────────────────────────
-- 4. CATEGORIES
-- ─────────────────────────────────────────────────────────
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_categories_all" ON public.categories;
DROP POLICY IF EXISTS "Categories: leitura pública" ON public.categories;
DROP POLICY IF EXISTS "Categories: admin gerencia" ON public.categories;
DROP POLICY IF EXISTS "categories_public_read" ON public.categories;

CREATE POLICY "categories_public_select" ON public.categories
  FOR SELECT USING (true);

CREATE POLICY "categories_admin_all" ON public.categories
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ─────────────────────────────────────────────────────────
-- 5. PRODUCTS
-- ─────────────────────────────────────────────────────────
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_products_all" ON public.products;
DROP POLICY IF EXISTS "Products: leitura pública" ON public.products;
DROP POLICY IF EXISTS "Products: admin gerencia" ON public.products;
DROP POLICY IF EXISTS "products_public_read" ON public.products;

CREATE POLICY "products_public_select" ON public.products
  FOR SELECT USING (true);

CREATE POLICY "products_admin_all" ON public.products
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ─────────────────────────────────────────────────────────
-- 6. PRODUCT_VARIANTS
-- ─────────────────────────────────────────────────────────
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_variants_all" ON public.product_variants;
DROP POLICY IF EXISTS "Product Variants: leitura pública" ON public.product_variants;
DROP POLICY IF EXISTS "Product Variants: admin gerencia" ON public.product_variants;
DROP POLICY IF EXISTS "variants_public_read" ON public.product_variants;

CREATE POLICY "variants_public_select" ON public.product_variants
  FOR SELECT USING (true);

CREATE POLICY "variants_admin_all" ON public.product_variants
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ─────────────────────────────────────────────────────────
-- 7. PROMOTIONS
-- ─────────────────────────────────────────────────────────
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_promotions_all" ON public.promotions;
DROP POLICY IF EXISTS "Promotions: leitura pública" ON public.promotions;
DROP POLICY IF EXISTS "Promotions: admin gerencia" ON public.promotions;
DROP POLICY IF EXISTS "promotions_public_read" ON public.promotions;

CREATE POLICY "promotions_public_select" ON public.promotions
  FOR SELECT USING (true);

CREATE POLICY "promotions_admin_all" ON public.promotions
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ─────────────────────────────────────────────────────────
-- 8. COUPONS
-- ─────────────────────────────────────────────────────────
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_coupons_all" ON public.coupons;
DROP POLICY IF EXISTS "Coupons: leitura pública" ON public.coupons;
DROP POLICY IF EXISTS "Coupons: admin gerencia" ON public.coupons;
DROP POLICY IF EXISTS "coupons_public_read" ON public.coupons;

CREATE POLICY "coupons_public_select" ON public.coupons
  FOR SELECT USING (true);

CREATE POLICY "coupons_admin_all" ON public.coupons
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ─────────────────────────────────────────────────────────
-- 9. ORDERS
-- ─────────────────────────────────────────────────────────
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_orders_all" ON public.orders;
DROP POLICY IF EXISTS "Orders: próprias" ON public.orders;
DROP POLICY IF EXISTS "Orders: cliente cria" ON public.orders;
DROP POLICY IF EXISTS "Orders: admin gerencia" ON public.orders;
DROP POLICY IF EXISTS "orders_own_select" ON public.orders;
DROP POLICY IF EXISTS "orders_own_insert" ON public.orders;

CREATE POLICY "orders_select_own_or_admin" ON public.orders
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "orders_insert_own_or_admin" ON public.orders
  FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "orders_update_admin" ON public.orders
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "orders_delete_admin" ON public.orders
  FOR DELETE USING (public.is_admin());


-- ─────────────────────────────────────────────────────────
-- 10. ORDER_ITEMS
-- ─────────────────────────────────────────────────────────
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_order_items" ON public.order_items;
DROP POLICY IF EXISTS "Order Items: via order" ON public.order_items;
DROP POLICY IF EXISTS "Order Items: insert com order" ON public.order_items;
DROP POLICY IF EXISTS "Order Items: admin gerencia" ON public.order_items;

CREATE POLICY "order_items_select_via_order" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND (orders.user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "order_items_insert_via_order" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND (orders.user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "order_items_update_admin" ON public.order_items
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "order_items_delete_admin" ON public.order_items
  FOR DELETE USING (public.is_admin());


-- ─────────────────────────────────────────────────────────
-- 11. POINTS_TRANSACTIONS
-- ─────────────────────────────────────────────────────────
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_points" ON public.points_transactions;
DROP POLICY IF EXISTS "Points: próprias" ON public.points_transactions;
DROP POLICY IF EXISTS "Points: admin gerencia" ON public.points_transactions;

CREATE POLICY "points_select_own_or_admin" ON public.points_transactions
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "points_admin_all" ON public.points_transactions
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ─────────────────────────────────────────────────────────
-- 12. WHATSAPP_TEMPLATES
-- ─────────────────────────────────────────────────────────
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_whatsapp_templates_all" ON public.whatsapp_templates;
DROP POLICY IF EXISTS "WhatsApp Templates: admin gerencia" ON public.whatsapp_templates;

CREATE POLICY "whatsapp_templates_admin_all" ON public.whatsapp_templates
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ─────────────────────────────────────────────────────────
-- 13. SCHEDULED_PROMOTIONS
-- ─────────────────────────────────────────────────────────
ALTER TABLE public.scheduled_promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_scheduled_promos_all" ON public.scheduled_promotions;
DROP POLICY IF EXISTS "Scheduled Promotions: leitura pública" ON public.scheduled_promotions;
DROP POLICY IF EXISTS "Scheduled Promotions: admin gerencia" ON public.scheduled_promotions;

CREATE POLICY "scheduled_promotions_public_select" ON public.scheduled_promotions
  FOR SELECT USING (true);

CREATE POLICY "scheduled_promotions_admin_all" ON public.scheduled_promotions
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ─────────────────────────────────────────────────────────
-- 14. STORAGE — Buckets de imagens
-- ─────────────────────────────────────────────────────────

-- Garantir que os buckets existam e sejam públicos
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('category-images', 'category-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('promotion-images', 'promotion-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Limpar policies antigas do storage
DROP POLICY IF EXISTS "Storage: leitura pública" ON storage.objects;
DROP POLICY IF EXISTS "Storage: admin upload" ON storage.objects;
DROP POLICY IF EXISTS "Storage: admin update" ON storage.objects;
DROP POLICY IF EXISTS "Storage: admin delete" ON storage.objects;
DROP POLICY IF EXISTS "storage_public_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "storage_admin_delete" ON storage.objects;

-- Leitura pública das imagens
CREATE POLICY "storage_public_select" ON storage.objects
  FOR SELECT USING (
    bucket_id IN ('product-images', 'category-images', 'promotion-images')
  );

-- Admin pode fazer upload
CREATE POLICY "storage_admin_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id IN ('product-images', 'category-images', 'promotion-images')
    AND public.is_admin()
  );

-- Admin pode atualizar
CREATE POLICY "storage_admin_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id IN ('product-images', 'category-images', 'promotion-images')
    AND public.is_admin()
  ) WITH CHECK (
    bucket_id IN ('product-images', 'category-images', 'promotion-images')
    AND public.is_admin()
  );

-- Admin pode deletar
CREATE POLICY "storage_admin_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id IN ('product-images', 'category-images', 'promotion-images')
    AND public.is_admin()
  );


-- ═══════════════════════════════════════════════════════════
-- FIM DA MIGRATION 006
-- ═══════════════════════════════════════════════════════════

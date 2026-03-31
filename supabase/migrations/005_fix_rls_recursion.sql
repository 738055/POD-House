-- ═══════════════════════════════════════════════════════════
-- POD HOUSE — Fix RLS Recursion
-- ═══════════════════════════════════════════════════════════

-- 1. Create a function to check for admin role safely
-- This function uses `security definer` to bypass RLS for the role check,
-- thus avoiding the infinite recursion.
create or replace function public.is_admin()
returns boolean as $$
declare
  user_role text;
begin
  -- Bypasses RLS by using security definer
  select role into user_role from public.profiles where id = auth.uid();
  return user_role = 'admin';
exception
  -- If the query fails (e.g., profile not found), return false
  when others then
    return false;
end;
$$ language plpgsql security definer;

-- 2. Update existing admin policies to use the new function

-- Table: profiles
drop policy if exists "admins_all_profiles" on public.profiles;
create policy "admins_all_profiles" on public.profiles for all
  using (public.is_admin());

-- Table: neighborhoods
drop policy if exists "admins_neighborhoods_all" on public.neighborhoods;
create policy "admins_neighborhoods_all" on public.neighborhoods for all
  using (public.is_admin());

-- Table: categories
drop policy if exists "admins_categories_all" on public.categories;
create policy "admins_categories_all" on public.categories for all
  using (public.is_admin());

-- Table: products
drop policy if exists "admins_products_all" on public.products;
create policy "admins_products_all" on public.products for all
  using (public.is_admin());

-- Table: product_variants
drop policy if exists "admins_variants_all" on public.product_variants;
create policy "admins_variants_all" on public.product_variants for all
  using (public.is_admin());

-- Table: promotions
drop policy if exists "admins_promotions_all" on public.promotions;
create policy "admins_promotions_all" on public.promotions for all
  using (public.is_admin());

-- Table: coupons
drop policy if exists "admins_coupons_all" on public.coupons;
create policy "admins_coupons_all" on public.coupons for all
  using (public.is_admin());

-- Table: orders
drop policy if exists "admins_orders_all" on public.orders;
create policy "admins_orders_all" on public.orders for all
  using (public.is_admin());

-- Table: order_items
drop policy if exists "admins_order_items" on public.order_items;
create policy "admins_order_items" on public.order_items for all
  using (public.is_admin());

-- Table: points_transactions
drop policy if exists "admins_points" on public.points_transactions;
create policy "admins_points" on public.points_transactions for all
  using (public.is_admin());

-- From 003_enhancements.sql
drop policy if exists "admins_whatsapp_templates_all" on public.whatsapp_templates;
create policy "admins_whatsapp_templates_all" on public.whatsapp_templates for all
  using (public.is_admin());

drop policy if exists "admins_scheduled_promos_all" on public.scheduled_promotions;
create policy "admins_scheduled_promos_all" on public.scheduled_promotions for all
  using (public.is_admin());

-- Grant execute on the function to authenticated users
grant execute on function public.is_admin() to authenticated;

-- Re-enable RLS on profiles in case it was disabled for testing
alter table public.profiles enable row level security;
alter table public.profiles force row level security;

-- NOTE: You must apply this migration to your Supabase project for the fix to take effect.
-- You can do this by using the Supabase CLI: `supabase db push` or by running this SQL in the Supabase Studio SQL Editor.


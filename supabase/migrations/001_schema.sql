-- ═══════════════════════════════════════════════════════════
-- POD HOUSE — Schema Supabase
-- Execute no SQL Editor do seu projeto Supabase
-- ═══════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

-- ──────────────────────────────────────────────
-- PROFILES (espelha auth.users)
-- ──────────────────────────────────────────────
create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  full_name      text,
  phone          text,
  role           text not null default 'client' check (role in ('client','admin')),
  points_balance integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "users_own_profile_select" on public.profiles for select using (auth.uid() = id);
create policy "users_own_profile_update" on public.profiles for update using (auth.uid() = id);
create policy "admins_all_profiles"      on public.profiles for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Auto-criar profile ao registrar
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ──────────────────────────────────────────────
-- ENDEREÇOS
-- ──────────────────────────────────────────────
create table public.addresses (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  label        text,
  logradouro   text not null,
  number       text not null,
  complement   text,
  neighborhood text not null,
  city         text not null default 'Londrina',
  uf           char(2) not null default 'PR',
  cep          char(8) not null,
  is_default   boolean not null default false,
  created_at   timestamptz not null default now()
);
alter table public.addresses enable row level security;
create policy "users_own_addresses" on public.addresses for all using (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- BAIRROS / TAXA DE ENTREGA
-- ──────────────────────────────────────────────
create table public.neighborhoods (
  id                uuid primary key default uuid_generate_v4(),
  name              text not null,
  name_normalized   text generated always as (lower(trim(name))) stored,
  cep_prefix        text,
  delivery_fee      numeric(10,2) not null default 5.00,
  estimated_minutes integer not null default 45,
  active            boolean not null default true
);
create unique index neighborhoods_name_idx on public.neighborhoods(name_normalized);
alter table public.neighborhoods enable row level security;
create policy "public_neighborhoods_select" on public.neighborhoods for select using (active = true);
create policy "admins_neighborhoods_all"    on public.neighborhoods for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ──────────────────────────────────────────────
-- CATEGORIAS
-- ──────────────────────────────────────────────
create table public.categories (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text not null unique,
  image_url   text,
  sort_order  integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.categories enable row level security;
create policy "public_categories_select" on public.categories for select using (active = true);
create policy "admins_categories_all"    on public.categories for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ──────────────────────────────────────────────
-- PRODUTOS
-- ──────────────────────────────────────────────
create table public.products (
  id          uuid primary key default uuid_generate_v4(),
  category_id uuid references public.categories(id) on delete set null,
  name        text not null,
  description text,
  base_price  numeric(10,2) not null default 0,
  puffs       text,
  is_featured boolean not null default false,
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.products enable row level security;
create policy "public_products_select" on public.products for select using (active = true);
create policy "admins_products_all"    on public.products for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ──────────────────────────────────────────────
-- VARIAÇÕES DO PRODUTO (sabores / modelos)
-- ──────────────────────────────────────────────
create table public.product_variants (
  id             uuid primary key default uuid_generate_v4(),
  product_id     uuid not null references public.products(id) on delete cascade,
  name           text not null,
  image_url      text,
  price_override numeric(10,2),      -- null = usa base_price do produto
  stock          integer not null default 0,
  active         boolean not null default true,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now()
);
alter table public.product_variants enable row level security;
create policy "public_variants_select" on public.product_variants for select using (active = true);
create policy "admins_variants_all"    on public.product_variants for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ──────────────────────────────────────────────
-- PROMOÇÕES (banners)
-- ──────────────────────────────────────────────
create table public.promotions (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  description text,
  image_url   text,
  badge       text,
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.promotions enable row level security;
create policy "public_promotions_select" on public.promotions for select using (active = true);
create policy "admins_promotions_all"    on public.promotions for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ──────────────────────────────────────────────
-- CUPONS
-- ──────────────────────────────────────────────
create table public.coupons (
  id                uuid primary key default uuid_generate_v4(),
  code              text not null unique,
  description       text,
  type              text not null check (type in ('percentage','fixed','free_delivery')),
  value             numeric(10,2) not null default 0,
  min_order_value   numeric(10,2) not null default 0,
  max_uses_total    integer,
  max_uses_per_user integer not null default 1,
  current_uses      integer not null default 0,
  valid_from        timestamptz not null default now(),
  valid_until       timestamptz,
  active            boolean not null default true,
  created_at        timestamptz not null default now()
);
alter table public.coupons enable row level security;
create policy "admins_coupons_all" on public.coupons for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ──────────────────────────────────────────────
-- USO DE CUPONS POR USUÁRIO
-- ──────────────────────────────────────────────
create table public.user_coupons (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  coupon_id  uuid not null references public.coupons(id) on delete cascade,
  order_id   uuid,
  used_at    timestamptz not null default now()
);
alter table public.user_coupons enable row level security;
create policy "users_own_coupons_select" on public.user_coupons for select using (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- PEDIDOS
-- ──────────────────────────────────────────────
create table public.orders (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid references public.profiles(id) on delete set null,
  -- endereço snapshot
  address_logradouro   text not null,
  address_number       text not null,
  address_complement   text,
  address_neighborhood text not null,
  address_city         text not null,
  address_uf           char(2) not null,
  address_cep          char(8) not null,
  -- valores
  subtotal             numeric(10,2) not null,
  delivery_fee         numeric(10,2) not null default 0,
  coupon_id            uuid references public.coupons(id) on delete set null,
  coupon_code          text,
  coupon_discount      numeric(10,2) not null default 0,
  points_redeemed      integer not null default 0,
  points_discount      numeric(10,2) not null default 0,
  total                numeric(10,2) not null,
  -- meta
  status               text not null default 'pending'
                         check (status in ('pending','confirmed','preparing','out_for_delivery','delivered','cancelled')),
  customer_name        text,
  customer_phone       text,
  notes                text,
  whatsapp_sent        boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
alter table public.orders enable row level security;
create policy "users_own_orders_select" on public.orders for select using (auth.uid() = user_id);
create policy "insert_orders"           on public.orders for insert with check (true);
create policy "admins_orders_all"       on public.orders for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ──────────────────────────────────────────────
-- ITENS DO PEDIDO
-- ──────────────────────────────────────────────
create table public.order_items (
  id           uuid primary key default uuid_generate_v4(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  variant_id   uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  variant_name text not null,
  unit_price   numeric(10,2) not null,
  quantity     integer not null,
  subtotal     numeric(10,2) generated always as (unit_price * quantity) stored
);
alter table public.order_items enable row level security;
create policy "users_own_order_items" on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);
create policy "insert_order_items"    on public.order_items for insert with check (true);
create policy "admins_order_items"    on public.order_items for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ──────────────────────────────────────────────
-- TRANSAÇÕES DE PONTOS
-- ──────────────────────────────────────────────
create table public.points_transactions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  order_id    uuid references public.orders(id) on delete set null,
  type        text not null check (type in ('earn','redeem','expire','adjustment')),
  points      integer not null,
  description text,
  created_at  timestamptz not null default now()
);
alter table public.points_transactions enable row level security;
create policy "users_own_points" on public.points_transactions for select using (auth.uid() = user_id);
create policy "insert_points"    on public.points_transactions for insert with check (true);
create policy "admins_points"    on public.points_transactions for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ──────────────────────────────────────────────
-- CARRINHO PERSISTENTE (usuários logados)
-- ──────────────────────────────────────────────
create table public.cart_items (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity   integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, variant_id)
);
alter table public.cart_items enable row level security;
create policy "users_own_cart" on public.cart_items for all using (auth.uid() = user_id);

-- ══════════════════════════════════════════════
-- RPC: validate_coupon
-- ══════════════════════════════════════════════
create or replace function public.validate_coupon(
  p_code      text,
  p_user_id   uuid,
  p_subtotal  numeric
)
returns jsonb language plpgsql security definer as $$
declare
  v_coupon    record;
  v_uses      integer;
  v_discount  numeric;
begin
  select * into v_coupon from public.coupons
  where code = upper(trim(p_code))
    and active = true
    and (valid_until is null or valid_until > now());
  if not found then
    return jsonb_build_object('valid',false,'error','Cupom inválido ou expirado');
  end if;
  if p_subtotal < v_coupon.min_order_value then
    return jsonb_build_object('valid',false,'error', format('Pedido mínimo R$ %.2f', v_coupon.min_order_value));
  end if;
  if v_coupon.max_uses_total is not null and v_coupon.current_uses >= v_coupon.max_uses_total then
    return jsonb_build_object('valid',false,'error','Cupom esgotado');
  end if;
  select count(*) into v_uses from public.user_coupons
  where user_id = p_user_id and coupon_id = v_coupon.id;
  if v_uses >= v_coupon.max_uses_per_user then
    return jsonb_build_object('valid',false,'error','Você já utilizou este cupom');
  end if;
  if v_coupon.type = 'percentage' then
    v_discount := round(p_subtotal * v_coupon.value / 100, 2);
  elsif v_coupon.type = 'fixed' then
    v_discount := least(v_coupon.value, p_subtotal);
  else
    v_discount := 0;
  end if;
  return jsonb_build_object('valid',true,'type',v_coupon.type,'value',v_coupon.value,'discount',v_discount,'coupon_id',v_coupon.id);
end;
$$;

-- ══════════════════════════════════════════════
-- RPC: place_order (transação atômica)
-- ══════════════════════════════════════════════
create or replace function public.place_order(
  p_user_id          uuid,
  p_address          jsonb,
  p_items            jsonb,
  p_delivery_fee     numeric,
  p_coupon_code      text    default null,
  p_points_to_redeem integer default 0,
  p_customer_name    text    default null,
  p_customer_phone   text    default null,
  p_notes            text    default null
)
returns jsonb language plpgsql security definer as $$
declare
  v_order_id        uuid;
  v_subtotal        numeric := 0;
  v_coupon_id       uuid;
  v_coupon_code     text;
  v_coupon_discount numeric := 0;
  v_coupon_type     text;
  v_coupon_value    numeric;
  v_coupon_min      numeric;
  v_coupon_total    integer;
  v_coupon_max      integer;
  v_user_uses       integer;
  v_coupon_maxpu    integer;
  v_points_discount numeric := 0;
  v_user_points     integer;
  v_total           numeric;
  v_pts_earned      integer;
  v_item            jsonb;
  v_stock           integer;
begin
  -- 1. Calcular subtotal e deduzir estoque
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_subtotal := v_subtotal + (v_item->>'unit_price')::numeric * (v_item->>'quantity')::integer;
    select stock into v_stock from public.product_variants
    where id = (v_item->>'variant_id')::uuid for update;
    if v_stock < (v_item->>'quantity')::integer then
      raise exception 'Estoque insuficiente: %', v_item->>'variant_name';
    end if;
    update public.product_variants set stock = stock - (v_item->>'quantity')::integer
    where id = (v_item->>'variant_id')::uuid;
  end loop;

  -- 2. Validar cupom
  if p_coupon_code is not null and trim(p_coupon_code) <> '' then
    select id, type, value, min_order_value, current_uses, max_uses_total, max_uses_per_user, code
    into v_coupon_id, v_coupon_type, v_coupon_value, v_coupon_min, v_coupon_total,
         v_coupon_max, v_coupon_maxpu, v_coupon_code
    from public.coupons
    where code = upper(trim(p_coupon_code)) and active = true
      and (valid_until is null or valid_until > now()) for update;
    if not found then raise exception 'Cupom inválido'; end if;
    if v_subtotal < v_coupon_min then raise exception 'Pedido abaixo do mínimo do cupom'; end if;
    if v_coupon_max is not null and v_coupon_total >= v_coupon_max then raise exception 'Cupom esgotado'; end if;
    select count(*) into v_user_uses from public.user_coupons
    where user_id = p_user_id and coupon_id = v_coupon_id;
    if v_user_uses >= v_coupon_maxpu then raise exception 'Cupom já utilizado'; end if;
    if v_coupon_type = 'percentage' then
      v_coupon_discount := round(v_subtotal * v_coupon_value / 100, 2);
    elsif v_coupon_type = 'fixed' then
      v_coupon_discount := least(v_coupon_value, v_subtotal);
    elsif v_coupon_type = 'free_delivery' then
      v_coupon_discount := p_delivery_fee;
    end if;
    update public.coupons set current_uses = current_uses + 1 where id = v_coupon_id;
  end if;

  -- 3. Validar pontos
  if p_points_to_redeem > 0 then
    select points_balance into v_user_points from public.profiles where id = p_user_id for update;
    if v_user_points is null or v_user_points < p_points_to_redeem then
      raise exception 'Pontos insuficientes';
    end if;
    v_points_discount := round((p_points_to_redeem::numeric / 100) * 5, 2);
  end if;

  -- 4. Total final
  v_total := greatest(0, v_subtotal + p_delivery_fee - v_coupon_discount - v_points_discount);

  -- 5. Inserir pedido
  insert into public.orders (
    user_id, address_logradouro, address_number, address_complement,
    address_neighborhood, address_city, address_uf, address_cep,
    subtotal, delivery_fee, coupon_id, coupon_code, coupon_discount,
    points_redeemed, points_discount, total, customer_name, customer_phone, notes
  ) values (
    p_user_id,
    p_address->>'logradouro', p_address->>'number', p_address->>'complement',
    p_address->>'neighborhood', p_address->>'city', p_address->>'uf', p_address->>'cep',
    v_subtotal, p_delivery_fee, v_coupon_id, v_coupon_code, v_coupon_discount,
    p_points_to_redeem, v_points_discount, v_total, p_customer_name, p_customer_phone, p_notes
  ) returning id into v_order_id;

  -- 6. Inserir itens
  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into public.order_items (order_id, variant_id, product_name, variant_name, unit_price, quantity)
    values (
      v_order_id, (v_item->>'variant_id')::uuid,
      v_item->>'product_name', v_item->>'variant_name',
      (v_item->>'unit_price')::numeric, (v_item->>'quantity')::integer
    );
  end loop;

  -- 7. Deduzir pontos
  if p_points_to_redeem > 0 then
    update public.profiles set points_balance = points_balance - p_points_to_redeem where id = p_user_id;
    insert into public.points_transactions (user_id, order_id, type, points, description)
    values (p_user_id, v_order_id, 'redeem', -p_points_to_redeem, 'Resgate em pedido');
  end if;

  -- 8. Ganhar pontos (1 pt por R$1 do total pago)
  v_pts_earned := floor(v_total)::integer;
  if v_pts_earned > 0 and p_user_id is not null then
    update public.profiles set points_balance = points_balance + v_pts_earned where id = p_user_id;
    insert into public.points_transactions (user_id, order_id, type, points, description)
    values (p_user_id, v_order_id, 'earn', v_pts_earned, 'Pontos ganhos em pedido');
  end if;

  -- 9. Registrar uso do cupom
  if v_coupon_id is not null and p_user_id is not null then
    insert into public.user_coupons (user_id, coupon_id, order_id)
    values (p_user_id, v_coupon_id, v_order_id);
  end if;

  -- 10. Limpar carrinho do usuário
  if p_user_id is not null then
    delete from public.cart_items where user_id = p_user_id;
  end if;

  return jsonb_build_object(
    'order_id', v_order_id,
    'total', v_total,
    'points_earned', v_pts_earned
  );
end;
$$;

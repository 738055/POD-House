-- ═══════════════════════════════════════════════════════════
-- POD HOUSE — Migration 013: Sistema de Pontos Configurável
-- ═══════════════════════════════════════════════════════════

-- ── 1. Tabela de configurações de pontos (linha única) ──────
create table if not exists public.points_settings (
  id                   text primary key default 'default',
  earn_rate            numeric(6,4) not null default 1.0,
  -- pontos por R$1 gasto. Ex: 1.0 = 1 pt por real
  redeem_rate          numeric(6,4) not null default 0.05,
  -- R$ por ponto ao resgatar. Ex: 0.05 → 100 pts = R$5,00
  min_points_to_redeem integer      not null default 100,
  max_redeem_percent   numeric(5,4) not null default 0.20,
  -- máx % do total do pedido pago com pontos (0.20 = 20%)
  expiration_days      integer      not null default 0,
  -- 0 = sem expiração
  enabled              boolean      not null default true,
  updated_at           timestamptz  not null default now()
);

-- RLS
alter table public.points_settings enable row level security;

create policy "points_settings_select"
  on public.points_settings for select using (true);

create policy "points_settings_admin_all"
  on public.points_settings for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ));

-- ── 2. Seed padrão ─────────────────────────────────────────
insert into public.points_settings
  (id, earn_rate, redeem_rate, min_points_to_redeem, max_redeem_percent, expiration_days, enabled)
values
  ('default', 1.0, 0.05, 100, 0.20, 0, true)
on conflict (id) do nothing;

-- ── 3. Recriar place_order com configurações dinâmicas ──────
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
  v_item            jsonb;
  v_stock           integer;
  -- settings
  v_redeem_rate     numeric;
  v_min_redeem      integer;
  v_max_pct         numeric;
  v_pts_enabled     boolean;
begin
  -- Carregar configurações de pontos
  select redeem_rate, min_points_to_redeem, max_redeem_percent, enabled
  into v_redeem_rate, v_min_redeem, v_max_pct, v_pts_enabled
  from public.points_settings where id = 'default';

  -- fallback seguro
  if v_redeem_rate is null then
    v_redeem_rate := 0.05; v_min_redeem := 100; v_max_pct := 0.20; v_pts_enabled := true;
  end if;

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
  if p_points_to_redeem > 0 and v_pts_enabled then
    if p_points_to_redeem < v_min_redeem then
      raise exception 'Mínimo de % pontos para resgate', v_min_redeem;
    end if;
    select points_balance into v_user_points from public.profiles where id = p_user_id for update;
    if v_user_points is null or v_user_points < p_points_to_redeem then
      raise exception 'Pontos insuficientes';
    end if;
    v_points_discount := round(p_points_to_redeem::numeric * v_redeem_rate, 2);
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

  -- 7. Deduzir pontos resgatados
  if p_points_to_redeem > 0 and v_pts_enabled then
    update public.profiles set points_balance = points_balance - p_points_to_redeem where id = p_user_id;
    insert into public.points_transactions (user_id, order_id, type, points, description)
    values (p_user_id, v_order_id, 'redeem', -p_points_to_redeem, 'Resgate em pedido');
  end if;

  -- 8. Registrar uso do cupom
  if v_coupon_id is not null and p_user_id is not null then
    insert into public.user_coupons (user_id, coupon_id, order_id)
    values (p_user_id, v_coupon_id, v_order_id);
  end if;

  -- 9. Limpar carrinho
  if p_user_id is not null then
    delete from public.cart_items where user_id = p_user_id;
  end if;

  return jsonb_build_object(
    'order_id', v_order_id,
    'total', v_total,
    'points_earned', 0
  );
end;
$$;

-- ── 4. Recriar confirm_order com earn_rate dinâmico ─────────
create or replace function public.confirm_order(p_order_id uuid)
returns jsonb language plpgsql security definer as $$
declare
  v_order      record;
  v_pts_earned integer;
  v_earn_rate  numeric;
  v_enabled    boolean;
begin
  select earn_rate, enabled into v_earn_rate, v_enabled
  from public.points_settings where id = 'default';

  if v_earn_rate is null then v_earn_rate := 1.0; v_enabled := true; end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Pedido não encontrado'; end if;

  if v_order.status not in ('pending') then
    raise exception 'Pedido já foi processado (status: %)', v_order.status;
  end if;

  update public.orders set status = 'confirmed', updated_at = now() where id = p_order_id;

  v_pts_earned := floor(v_order.total * v_earn_rate)::integer;
  if v_pts_earned > 0 and v_order.user_id is not null and v_enabled then
    update public.profiles
    set points_balance = points_balance + v_pts_earned, updated_at = now()
    where id = v_order.user_id;

    insert into public.points_transactions (user_id, order_id, type, points, description)
    values (v_order.user_id, p_order_id, 'earn', v_pts_earned, 'Pontos ganhos — pedido confirmado pelo dono');
  end if;

  return jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'points_earned', v_pts_earned,
    'user_id', v_order.user_id
  );
end;
$$;

-- ── 5. RPC admin: ajuste manual de pontos ──────────────────
create or replace function public.adjust_user_points(
  p_user_id     uuid,
  p_points      integer,
  p_description text
)
returns jsonb language plpgsql security definer as $$
declare
  v_new_balance integer;
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Acesso negado';
  end if;

  update public.profiles
  set points_balance = greatest(0, points_balance + p_points),
      updated_at = now()
  where id = p_user_id
  returning points_balance into v_new_balance;

  if not found then raise exception 'Usuário não encontrado'; end if;

  insert into public.points_transactions (user_id, order_id, type, points, description)
  values (p_user_id, null, 'adjustment', p_points, p_description);

  return jsonb_build_object('success', true, 'new_balance', v_new_balance);
end;
$$;

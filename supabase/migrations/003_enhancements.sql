-- ═══════════════════════════════════════════════════════════
-- POD HOUSE — Migration 003: Enhancements
-- WhatsApp Templates, Scheduled Promotions, User Enhancements
-- ═══════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────
-- WHATSAPP TEMPLATES
-- ──────────────────────────────────────────────
create table public.whatsapp_templates (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text not null unique,
  category    text not null default 'general'
                check (category in ('order_confirmation','order_status','promotion','welcome','custom')),
  message     text not null,
  variables   text[] not null default '{}',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.whatsapp_templates enable row level security;
create policy "admins_whatsapp_templates_all" on public.whatsapp_templates for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ──────────────────────────────────────────────
-- SCHEDULED PROMOTIONS (calendar/weekly planning)
-- ──────────────────────────────────────────────
create table public.scheduled_promotions (
  id            uuid primary key default uuid_generate_v4(),
  title         text not null,
  description   text,
  promotion_id  uuid references public.promotions(id) on delete set null,
  coupon_id     uuid references public.coupons(id) on delete set null,
  scheduled_date date not null,
  day_of_week   integer generated always as (extract(dow from scheduled_date)::integer) stored,
  start_time    time not null default '00:00',
  end_time      time not null default '23:59',
  color         text not null default '#8B5CF6',
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);
alter table public.scheduled_promotions enable row level security;
create policy "public_scheduled_promos_select" on public.scheduled_promotions for select using (active = true);
create policy "admins_scheduled_promos_all" on public.scheduled_promotions for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ──────────────────────────────────────────────
-- ADD avatar_url TO PROFILES
-- ──────────────────────────────────────────────
alter table public.profiles add column if not exists avatar_url text;

-- ──────────────────────────────────────────────
-- UPDATE handle_new_user TO INCLUDE phone
-- ──────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$;

-- ──────────────────────────────────────────────
-- RPC: get_dashboard_stats (if not exists)
-- ──────────────────────────────────────────────
create or replace function public.get_dashboard_stats()
returns table(
  orders_count bigint,
  clients_count bigint,
  total_revenue numeric,
  products_count bigint
) language plpgsql security definer as $$
begin
  return query
  select
    (select count(*) from public.orders)::bigint,
    (select count(*) from public.profiles where role = 'client')::bigint,
    (select coalesce(sum(total), 0) from public.orders where status != 'cancelled')::numeric,
    (select count(*) from public.products where active = true)::bigint;
end;
$$;

-- ──────────────────────────────────────────────
-- SEED WHATSAPP TEMPLATES
-- ──────────────────────────────────────────────
insert into public.whatsapp_templates (name, slug, category, message, variables) values
  ('Confirmação de Pedido', 'order_confirmation', 'order_confirmation',
   'Olá {{nome}}! 🎉\n\nSeu pedido #{{pedido_id}} foi recebido com sucesso!\n\n📋 *Resumo do Pedido:*\n{{itens}}\n\n💰 *Total:* R$ {{total}}\n🏍️ *Entrega:* {{endereco}}\n⏱️ *Previsão:* {{tempo_estimado}}\n\nObrigado por comprar na POD House! 💜',
   ARRAY['nome','pedido_id','itens','total','endereco','tempo_estimado']),

  ('Pedido em Preparo', 'order_preparing', 'order_status',
   'Olá {{nome}}! 🔥\n\nSeu pedido #{{pedido_id}} está sendo preparado!\nEm breve sairá para entrega. 🏍️\n\nPOD House 💜',
   ARRAY['nome','pedido_id']),

  ('Saiu para Entrega', 'order_out_for_delivery', 'order_status',
   'Olá {{nome}}! 🏍️\n\nSeu pedido #{{pedido_id}} saiu para entrega!\nFique atento, logo chegará no seu endereço.\n\nPOD House 💜',
   ARRAY['nome','pedido_id']),

  ('Pedido Entregue', 'order_delivered', 'order_status',
   'Olá {{nome}}! ✅\n\nSeu pedido #{{pedido_id}} foi entregue com sucesso!\n\n⭐ Avalie sua experiência e ganhe pontos extras!\n💜 Obrigado por escolher a POD House!',
   ARRAY['nome','pedido_id']),

  ('Promoção do Dia', 'daily_promo', 'promotion',
   '🔥 *PROMOÇÃO DO DIA* 🔥\n\n{{titulo}}\n{{descricao}}\n\n🎟️ Use o cupom: *{{cupom}}*\n⏰ Válido somente hoje!\n\nAproveite! 💜 POD House',
   ARRAY['titulo','descricao','cupom']),

  ('Boas-vindas', 'welcome', 'welcome',
   'Olá {{nome}}! 👋\n\nSeja bem-vindo(a) à *POD House*! 💜\n\n🎁 Use o cupom *PRIMEIRACOMPRA* e ganhe 10% de desconto no seu primeiro pedido!\n\nExplore nosso cardápio e aproveite! 🛒',
   ARRAY['nome']);

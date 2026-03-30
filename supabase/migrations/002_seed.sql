-- ═══════════════════════════════════════════════════════════
-- SEED — Bairros de Londrina-PR com taxa de entrega
-- ═══════════════════════════════════════════════════════════

insert into public.neighborhoods (name, cep_prefix, delivery_fee, estimated_minutes) values
  ('Centro',                '86010', 5.00,  35),
  ('Gleba Palhano',         '86055', 8.00,  45),
  ('Cinco Conjuntos',       '86083', 6.00,  40),
  ('Jardim Shangri-lá',     '86055', 8.00,  45),
  ('Jardim Europa',         '86050', 7.00,  40),
  ('Jardim Bandeirantes',   '86040', 6.00,  40),
  ('Jardim Petrópolis',     '86031', 6.00,  40),
  ('Jardim Universitário',  '86051', 7.00,  40),
  ('Bela Suíça',            '86055', 8.00,  45),
  ('Cafezal',               '86082', 6.00,  40),
  ('Heimtal',               '86081', 7.00,  45),
  ('Conjunto Habitacional', '86079', 7.00,  45),
  ('Esperança',             '86079', 7.00,  45),
  ('Portal do Sol',         '86082', 7.00,  45),
  ('Jardim Los Angeles',    '86082', 7.00,  45),
  ('Jardim California',     '86082', 7.00,  45),
  ('Vivi Xavier',           '86030', 6.00,  40),
  ('São Lourenço',          '86041', 6.00,  40),
  ('Arapongas',             '86700', 15.00, 60),
  ('Cambé',                 '86183', 12.00, 55),
  ('Ibiporã',               '86200', 12.00, 55),
  ('Rolândia',              '86600', 18.00, 70),
  ('Outros (consultar)',    null,    10.00, 60)
on conflict do nothing;

-- ═══════════════════════════════════════════════════════════
-- CUPONS de exemplo
-- ═══════════════════════════════════════════════════════════

insert into public.coupons (code, description, type, value, min_order_value, max_uses_total, max_uses_per_user) values
  ('PRIMEIRACOMPRA', 'Desconto de 10% na primeira compra',  'percentage',    10, 50,  null, 1),
  ('FRETEGRATIS',    'Frete grátis sem mínimo',              'free_delivery',  0, 0,   100,  1),
  ('DESCONTO20',     'R$ 20 de desconto acima de R$ 150',   'fixed',         20, 150, 50,   2)
on conflict do nothing;

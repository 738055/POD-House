-- Adiciona coluna image_url na tabela products
-- Esta coluna permite cadastrar uma foto principal fixa para o produto,
-- independente das fotos dos sabores (product_variants).

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS image_url text;

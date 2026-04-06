'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Plus, Minus, Package } from 'lucide-react';
import type { Product, ProductVariant } from '@/lib/supabase/types';
import { useCart } from '@/hooks/use-cart';

interface Props {
  product: Product | null;
  onClose: () => void;
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function ProductDetailSheet({ product, onClose }: Props) {
  const { addItem } = useCart();
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const variants = product?.product_variants?.filter(v => v.active) ?? [];

  // Recupera a foto principal fixa caso cadastrada
  const productImg = (product as any)?.image_url;
  // Fallback para quando a variante selecionada não tem imagem
  const fallbackImage = productImg || variants.find(v => v.image_url)?.image_url || '/logo.png';

  useEffect(() => {
    if (product) {
      setQty(1);
      setAdded(false);
      const first = variants.find(v => v.stock > 0) ?? variants[0] ?? null;
      setSelectedVariant(first);
    }
  }, [product]);

  if (!product) return null;

  const price = selectedVariant?.price_override ?? product.base_price;
  // Prioriza a imagem do sabor selecionado. Se o sabor não tiver imagem, exibe a foto da Categoria.
  const imageUrl = selectedVariant?.image_url || productImg || fallbackImage;
  const outOfStock = selectedVariant ? selectedVariant.stock <= 0 : false;

  function handleSelectVariant(v: ProductVariant) {
    if (v.stock > 0) setSelectedVariant(v);
  }

  async function handleAdd() {
    if (!selectedVariant || qty < 1) return;
    await addItem({
      variantId:   selectedVariant.id,
      productId:   product!.id,
      productName: product!.name,
      variantName: selectedVariant.name,
      imageUrl:    selectedVariant.image_url || productImg || fallbackImage,
      unitPrice:   price,
      stock:       selectedVariant.stock,
    }, qty);
    setAdded(true);
    setTimeout(onClose, 600);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:w-auto md:max-w-5xl bg-white rounded-t-2xl md:rounded-2xl animate-slide-up overflow-hidden max-h-[94vh] md:max-h-[85vh] flex flex-col md:flex-row shadow-2xl">

        {/* LEFT: Imagem (Mobile top, Desktop left) */}
        <div className="relative bg-gray-50 flex-shrink-0 flex items-center justify-center p-6 w-full md:w-[400px] lg:w-[480px] h-[35vh] md:h-auto min-h-[250px] md:min-h-[500px]">
          <div className="relative w-full h-full max-w-[280px] md:max-w-full aspect-square">
            <Image
              key={imageUrl}
              src={imageUrl}
              alt={selectedVariant?.name ?? product.name}
              fill
              className="object-contain transition-opacity duration-300"
              sizes="(max-width: 768px) 100vw, 500px"
            />
          </div>
          {/* Fechar Mobile */}
          <button onClick={onClose}
            className="md:hidden absolute top-4 right-4 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md text-gray-500">
            <X size={18} />
          </button>
        </div>

        {/* RIGHT: Área de Detalhes e Sabores (Mobile bottom, Desktop right) */}
        <div className="flex flex-col flex-1 w-full md:w-[400px] lg:w-[450px] border-l border-gray-100 bg-white h-full max-h-[59vh] md:max-h-full">

          {/* Header Desktop */}
          <div className="hidden md:flex items-start justify-between p-5 pb-4 border-b border-gray-100">
            <div className="pr-4">
              <h2 className="text-xl font-bold text-gray-900 uppercase leading-tight">
                {product.name}
              </h2>
              {product.puffs && (
                <p className="text-sm text-gray-500 mt-1">{product.puffs}</p>
              )}
            </div>
            <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full transition-colors flex-shrink-0">
              <X size={20} />
            </button>
          </div>

          {/* Conteúdo scrollável */}
          <div className="overflow-y-auto flex-1 thin-scrollbar">
            <div className="p-5">
              {/* Header Mobile */}
              <div className="md:hidden mb-4">
                <h2 className="text-xl font-bold text-gray-900 uppercase leading-tight">
                  {product.name}
                </h2>
                {product.puffs && (
                  <p className="text-sm text-gray-500 mt-1">{product.puffs}</p>
                )}
              </div>

              {product.description && (
                <p className="text-sm text-gray-600 leading-relaxed mb-6">
                  {product.description}
                </p>
              )}

              {/* Lista de Sabores (Lateral no Desktop) */}
              {variants.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <p className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                      Sabores disponíveis
                    </p>
                    <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-1 rounded-md">
                      {variants.length} opções
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {variants.map(v => {
                      const isSelected = selectedVariant?.id === v.id;
                      const noStock    = v.stock <= 0;
                      return (
                        <button
                          key={v.id}
                          onClick={() => handleSelectVariant(v)}
                          disabled={noStock}
                          className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left group ${
                            isSelected
                              ? 'border-purple-600 bg-purple-50/50'
                              : noStock
                              ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                              : 'border-transparent bg-gray-50 hover:bg-gray-100 hover:border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-white border border-gray-100 overflow-hidden flex-shrink-0 relative">
                              {v.image_url ? (
                                <Image src={v.image_url} alt={v.name} fill className="object-contain p-1" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package size={16} className="text-gray-300" />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className={`text-sm font-bold truncate ${isSelected ? 'text-purple-700' : 'text-gray-800'}`}>
                                {v.name}
                              </span>
                              {v.price_override && (
                                <span className="text-xs font-bold text-[#0EAD69]">
                                  {fmt(v.price_override)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex-shrink-0 ml-3">
                            {noStock ? (
                              <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded uppercase border border-amber-200">Em falta</span>
                            ) : (
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-purple-600' : 'border-gray-300 group-hover:border-gray-400'}`}>
                                {isSelected && <div className="w-2.5 h-2.5 bg-purple-600 rounded-full" />}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer fixo */}
          <div className="p-4 border-t border-gray-100 bg-white flex-shrink-0">
            <div className="flex items-center gap-3">
              {/* Qty Controls */}
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-1.5 shrink-0">
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-11 h-11 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-600 active:bg-gray-100 disabled:opacity-40 transition-colors"
                  disabled={qty <= 1}
                >
                  <Minus size={18} />
                </button>
                <span className="text-base font-bold w-6 text-center text-gray-800">{qty}</span>
                <button
                  onClick={() => setQty(q => Math.min(q + 1, selectedVariant?.stock ?? 1))}
                  disabled={!selectedVariant || qty >= (selectedVariant?.stock ?? 0)}
                  className="w-11 h-11 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-600 active:bg-gray-100 disabled:opacity-40 transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>

              {/* Add Button */}
              <button
                onClick={handleAdd}
                disabled={outOfStock || !selectedVariant || added}
                className={`flex-1 flex items-center justify-between px-5 h-[56px] rounded-xl font-bold text-sm transition-all ${
                  added
                    ? 'bg-green-600 text-white shadow-lg shadow-green-600/30'
                    : outOfStock || !selectedVariant
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 hover:bg-purple-700 active:scale-[0.98]'
                }`}
              >
                <span className="uppercase tracking-wide">
                  {added ? '✓ Adicionado' : outOfStock ? 'Esgotado' : !selectedVariant && variants.length > 0 ? 'Selecione' : 'Adicionar'}
                </span>
                <span className="text-base">{fmt(price * qty)}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Plus, Minus, ChevronRight } from 'lucide-react';
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

  useEffect(() => {
    if (product) {
      setQty(1);
      setAdded(false);
      // Pré-seleciona o primeiro variant disponível (em estoque)
      const first = variants.find(v => v.stock > 0) ?? variants[0] ?? null;
      setSelectedVariant(first);
    }
  }, [product]);

  if (!product) return null;

  const price = selectedVariant?.price_override ?? product.base_price;
  const imageUrl = selectedVariant?.image_url ?? '';
  const outOfStock = selectedVariant ? selectedVariant.stock <= 0 : false;

  async function handleAdd() {
    if (!selectedVariant) return;
    await addItem({
      variantId:   selectedVariant.id,
      productId:   product!.id,
      productName: product!.name,
      variantName: selectedVariant.name,
      imageUrl:    selectedVariant.image_url ?? '',
      unitPrice:   price,
    }, qty);
    setAdded(true);
    setTimeout(onClose, 600);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ maxWidth: '480px', left: 0, right: 0, margin: '0 auto' }}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-2xl animate-slide-up overflow-hidden max-h-[92vh] flex flex-col">

        {/* Imagem */}
        <div className="relative bg-gray-50 flex-shrink-0" style={{ aspectRatio: '1/1', maxHeight: '38vh' }}>
          {imageUrl ? (
            <Image src={imageUrl} alt={selectedVariant?.name ?? product.name} fill className="object-contain p-5" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-200">
              <span className="text-6xl">📦</span>
            </div>
          )}
          <button onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md">
            <X size={16} />
          </button>
        </div>

        {/* Conteúdo scrollável */}
        <div className="overflow-y-auto flex-1">
          <div className="p-4">
            <h2 className="text-base font-bold text-gray-900 uppercase leading-tight mb-0.5">
              {product.name}
            </h2>
            {product.puffs && (
              <p className="text-xs text-gray-500 mb-2">{product.puffs}</p>
            )}
            {product.description && (
              <p className="text-sm text-gray-600 leading-relaxed mb-3">{product.description}</p>
            )}

            {/* Seletor de sabores / variações */}
            {variants.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  Selecione o sabor ({variants.length} opções)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {variants.map(v => {
                    const isSelected = selectedVariant?.id === v.id;
                    const noStock    = v.stock <= 0;
                    return (
                      <button
                        key={v.id}
                        onClick={() => !noStock && setSelectedVariant(v)}
                        disabled={noStock}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-left transition-all ${
                          isSelected
                            ? 'border-black bg-black text-white'
                            : noStock
                            ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                            : 'border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        {v.image_url && (
                          <div className={`w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 ${isSelected ? 'bg-white/10' : 'bg-gray-50'}`}>
                            <Image src={v.image_url} alt={v.name} width={36} height={36} className="w-full h-full object-contain p-0.5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className={`text-xs font-semibold leading-tight truncate ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                            {v.name}
                          </p>
                          {v.price_override && (
                            <p className={`text-[11px] ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                              {fmt(v.price_override)}
                            </p>
                          )}
                          {noStock && <p className="text-[10px] text-red-400">Esgotado</p>}
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
        <div className="p-4 border-t border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <p className="text-2xl font-bold text-gray-900">{fmt(price * qty)}</p>
            <div className="flex items-center gap-3">
              <button onClick={() => setQty(q => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-full border-2 border-gray-200 flex items-center justify-center active:bg-gray-100">
                <Minus size={14} />
              </button>
              <span className="text-lg font-bold w-6 text-center">{qty}</span>
              <button onClick={() => setQty(q => q + 1)}
                className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center">
                <Plus size={14} />
              </button>
            </div>
          </div>

          <button
            onClick={handleAdd}
            disabled={outOfStock || !selectedVariant || added}
            className={`w-full font-bold py-4 rounded-xl text-base transition-all ${
              added
                ? 'bg-green-600 text-white'
                : outOfStock || !selectedVariant
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-black text-white active:opacity-80'
            }`}
          >
            {added
              ? '✓ Adicionado!'
              : outOfStock
              ? 'Sem estoque'
              : !selectedVariant && variants.length > 0
              ? 'Selecione um sabor'
              : `Adicionar · ${fmt(price * qty)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

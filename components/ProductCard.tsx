'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ShoppingCart, Eye, Gift } from 'lucide-react';

interface Variation {
  id: string;
  variationName: string;
  salePrice: number;
  stock: number;
  imageUrl: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  variations: Variation[];
  promo?: {
    discountValue: number;
    discountType: 'PERCENTUAL' | 'VALOR_FIXO';
  };
}

const ProductCard = React.memo(function ProductCard({ product, onAddToCart }: { product: Product, onAddToCart: (product: Product, variation: Variation) => void }) {
  const [selectedVariation, setSelectedVariation] = useState(product.variations[0]);

  const hasPromo = !!product.promo;
  const originalPrice = selectedVariation.salePrice;
  let finalPrice = originalPrice;

  if (product.promo) {
    if (product.promo.discountType === 'PERCENTUAL') {
      finalPrice = originalPrice * (1 - product.promo.discountValue / 100);
    } else {
      finalPrice = Math.max(0, originalPrice - product.promo.discountValue);
    }
  }

  return (
    <div className="card-premium group flex flex-col h-full animate-fade-in">
      <div className="relative aspect-square overflow-hidden bg-surface-hover">
        <Image
          src={selectedVariation.imageUrl || 'https://picsum.photos/seed/pod/400/400'}
          alt={product.name}
          fill
          sizes="(max-width: 480px) 50vw, 200px"
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        {hasPromo && (
          <div className="absolute top-3 left-3 bg-secondary text-black text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest shadow-lg">
            {product.promo?.discountType === 'PERCENTUAL' ? `${product.promo.discountValue}% OFF` : `R$ ${product.promo?.discountValue} OFF`}
          </div>
        )}
        <button 
          onClick={() => onAddToCart(product, selectedVariation)}
          className="absolute bottom-3 right-3 w-10 h-10 bg-primary text-black rounded-full flex items-center justify-center shadow-xl transition-transform active:scale-90 hover:scale-110"
          disabled={selectedVariation.stock <= 0}
        >
          <ShoppingCart size={20} />
        </button>
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <h3 className="font-display text-lg uppercase tracking-tight mb-1 text-white group-hover:text-primary transition-colors">{product.name}</h3>
        <p className="text-[10px] text-gray-500 line-clamp-2 mb-3 uppercase tracking-widest font-bold">{product.description}</p>

        <div className="mt-auto space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-primary">
              R$ {finalPrice.toFixed(2)}
            </span>
            {hasPromo && (
              <span className="text-xs text-gray-600 line-through font-bold">
                R$ {originalPrice.toFixed(2)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 py-1.5 px-3 bg-secondary/10 rounded-xl border border-secondary/20 w-fit">
            <Gift size={12} className="text-secondary" />
            <span className="text-[9px] font-black text-secondary uppercase tracking-widest">
              + R$ {(finalPrice * 0.05).toFixed(2)} Cashback
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {product.variations.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedVariation(v)}
                className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg border transition-all ${
                  selectedVariation.id === v.id 
                    ? 'border-primary bg-primary/10 text-primary' 
                    : 'border-border text-gray-500 hover:border-gray-400'
                }`}
              >
                {v.variationName}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

export default ProductCard;

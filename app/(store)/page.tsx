'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import {
  MapPin,
  ChevronRight,
  Clock,
  Search,
  ChevronDown,
  Home,
  Tag,
  ShoppingBag,
  User,
  X,
  Plus,
  Minus,
  Gift,
  Bike,
  Star,
  Phone,
  Check,
  Package,
  Loader2,
  AlertTriangle,
  Truck,
  Ticket,
  Flame,
  Zap
} from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useAuth } from '@/hooks/use-auth';
import { createClient } from '@/lib/supabase/client';
import ProfileTab from '@/components/profile-tab';
import CheckoutFlow from '@/components/CheckoutFlow';
import OrdersTab from '@/components/orders-tab';
import ProductDetailSheet from '@/components/ProductDetailSheet';

type StoreSettings = {
  store_name: string;
  logo_url: string | null;
  cover_url: string | null;
  whatsapp_number: string | null;
  phone_number: string | null;
  address_display: string | null;
  opening_hours: string | null;
  min_order_value: number;
  delivery_info: string | null;
  is_open: boolean;
  promo_banner_enabled: boolean | null;
  promo_banner_text: string | null;
  promo_banner_bg_color: string | null;
  open_time: string | null;
  close_time: string | null;
  open_days: number[] | null;
};

/** Calcula se a loja está aberta agora com base no horário configurado */
function computeIsOpen(s: StoreSettings | null): boolean {
  if (!s) return true;
  if (s.is_open === false) return false;
  if (!s.open_time || !s.close_time) return s.is_open !== false;

  const now = new Date();
  const day = now.getDay();

  if (s.open_days && s.open_days.length > 0 && !s.open_days.includes(day)) return false;

  const [oh, om] = s.open_time.split(':').map(Number);
  const [ch, cm] = s.close_time.split(':').map(Number);
  const nowMin  = now.getHours() * 60 + now.getMinutes();
  const openMin = oh * 60 + om;
  const closeMin = ch * 60 + cm;

  return nowMin >= openMin && nowMin < closeMin;
}

type Promotion = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
};

type Category = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
};

type ProductVariant = {
  id: string;
  product_id: string;
  name: string;
  image_url: string | null;
  price_override: number | null;
  stock: number;
  active: boolean;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  image_url?: string | null;
  base_price: number;
  puffs: string | null;
  is_featured: boolean;
  active?: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
  category_id: string | null;
  product_variants: ProductVariant[];
};

type DailySpecial = {
  id: string;
  product_id: string;
  variant_id: string | null;
  discount_type: 'percentage' | 'fixed' | 'none';
  discount_value: number;
  highlight_label: string;
  active: boolean;
  products: {
    id: string;
    name: string;
    description: string | null;
    base_price: number;
    puffs: string | null;
    product_variants: ProductVariant[];
  } | null;
  product_variants: ProductVariant | null;
};

type ScheduledPromo = {
  id: string;
  title: string;
  description: string | null;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  color: string;
  active: boolean;
  promotion_id: string | null;
  coupon_id: string | null;
  coupons?: { code: string; description: string | null } | null;
};

interface ZoneResult {
  zone_name: string;
  delivery_fee: number;
  estimated_minutes: number;
  distance_meters: number;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Formata dígitos de telefone: "43999991234" → "(43) 9 9999-1234" */
function formatPhone(v: string): string {
  const d = (v || '').replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return v;
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}

// ── Product card ─────────────────────────────────────────────────────────────
const ProductCard = React.memo(function ProductCard({ product, onOpen }: { product: Product; onOpen: (product: Product) => void }) {
  const activeVariants = product.product_variants.filter(v => v.active);
  const available = activeVariants.filter(v => v.stock > 0);
  const isOutOfStock = available.length === 0;

  const mainVariant = isOutOfStock ? activeVariants[0] : available[0];
  if (!mainVariant) return null;

  const allVariants = isOutOfStock ? activeVariants : available;
  const minPrice = Math.min(...allVariants.map(v => v.price_override ?? product.base_price));
  const hasMultiple = available.length > 1;
  const image = product.image_url || mainVariant.image_url || '/logo.png';

  return (
    <div
      onClick={() => onOpen(product)}
      className={`bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm transition-shadow cursor-pointer ${isOutOfStock ? 'opacity-70' : 'hover:shadow-md active:scale-[0.98]'}`}
    >
      <div className="relative bg-gray-50" style={{ aspectRatio: '1/1' }}>
        <Image
          src={image}
          alt={product.name}
          fill
          className="object-contain p-2"
          sizes="(max-width: 480px) 50vw, 200px"
        />
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white text-black text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow">
              Esgotado
            </span>
          </div>
        )}
        {!isOutOfStock && hasMultiple && (
          <div className="absolute bottom-2 right-2 bg-white/90 border border-gray-200 text-[10px] font-bold text-gray-600 px-1.5 py-0.5 rounded-full">
            {available.length} sabores
          </div>
        )}
      </div>
      <div className="p-3">
        {product.puffs && <p className="text-xs text-gray-500 font-medium mb-1 line-clamp-1">{product.puffs}</p>}
        <h3 className="text-sm font-bold text-gray-900 line-clamp-2 mb-2 leading-tight">{product.name}</h3>
        <div className="flex items-center justify-between">
          <div>
            {!isOutOfStock && hasMultiple && <p className="text-[10px] text-gray-400">a partir de</p>}
            <p className={`text-base font-bold ${isOutOfStock ? 'text-gray-400' : 'text-[#0EAD69]'}`}>{formatCurrency(minPrice)}</p>
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isOutOfStock ? 'bg-gray-200' : 'bg-black'}`}>
            <Plus size={16} className={isOutOfStock ? 'text-gray-400' : 'text-white'} />
          </div>
        </div>
      </div>
    </div>
  );
});

// ── Cart modal ────────────────────────────────────────────────────────────────
function CartModal({
  isOpen, onClose, items, onUpdateQuantity, onRemove, onCheckout
}: {
  isOpen: boolean; onClose: () => void; items: any[];
  onUpdateQuantity: (variantId: string, qty: number) => void;
  onRemove: (variantId: string) => void; onCheckout: () => void;
}) {
  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Minha Sacola</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingBag size={48} className="text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Sua sacola está vazia</p>
              <p className="text-gray-400 text-sm mt-1">Adicione produtos para continuar</p>
            </div>
          ) : items.map(item => (
            <div key={item.variantId} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-white border border-gray-100 flex-shrink-0">
                <Image src={item.imageUrl || '/logo.png'} alt={item.productName} width={56} height={56} className="w-full h-full object-contain p-1" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight">{item.productName} <span className="text-gray-500 font-normal">{item.variantName}</span></p>
                <p className="text-[#0EAD69] font-bold text-sm mt-1">{formatCurrency(item.unitPrice)}</p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <button onClick={() => onUpdateQuantity(item.variantId, item.quantity - 1)} className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"><Minus size={12} /></button>
                  <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQuantity(item.variantId, item.quantity + 1)}
                    disabled={item.quantity >= item.stock}
                    className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  ><Plus size={12} /></button>
                </div>
                {item.quantity >= item.stock && (
                  <span className="text-[10px] text-amber-600 font-semibold">máx. disponível</span>
                )}
              </div>
            </div>
          ))}
        </div>
        {items.length > 0 && (
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600 font-medium">Total</span>
              <span className="text-xl font-bold text-gray-900">{formatCurrency(total)}</span>
            </div>
            <button onClick={onCheckout} className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-colors active:scale-95">
              Finalizar Pedido
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Delivery modal — CEP real com ViaCEP + geocoding + RPC ───────────────────
function DeliveryModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const supabase = createClient();
  const [cep, setCep] = useState('');
  const [loading, setLoading] = useState(false);
  const [bairro, setBairro] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [result, setResult] = useState<ZoneResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setBairro('');
    setLogradouro('');
    setResult(null);
    setError(null);
  }

  async function handleCalculate() {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setLoading(true);
    reset();

    try {
      // 1. ViaCEP — preenche bairro e rua
      const viaRes = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const viaData = await viaRes.json();
      if (viaData.erro) {
        setError('CEP não encontrado. Verifique e tente novamente.');
        return;
      }
      setBairro(viaData.bairro ?? '');
      setLogradouro(viaData.logradouro ?? '');

      // 2. Nominatim — geocoding (CEP → coordenadas)
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?postalcode=${clean}&countrycodes=br&format=json&limit=1`,
        { headers: { 'User-Agent': 'POD-House/1.0', 'Accept-Language': 'pt-BR' } }
      );
      const geoData = await geoRes.json();
      if (!Array.isArray(geoData) || geoData.length === 0) {
        setError('Não foi possível localizar o endereço no mapa. Tente outro CEP.');
        return;
      }

      const lat = parseFloat(geoData[0].lat);
      const lng = parseFloat(geoData[0].lon);

      // 3. RPC — taxa de entrega por coordenadas
      const { data, error: rpcError } = await (supabase.rpc as any)('get_delivery_fee_by_coords', {
        p_lat: lat,
        p_lng: lng,
      });

      if (rpcError) {
        setError('Erro ao calcular entrega. Tente novamente.');
        return;
      }
      if (data?.error) {
        const msg = data.error as string;
        if (msg.toLowerCase().includes('não configurada')) {
          setError('Área de entrega ainda não configurada. Entre em contato pelo WhatsApp.');
        } else {
          const dist = data.distance_meters ? ` (${(data.distance_meters / 1000).toFixed(1)} km de distância)` : '';
          setError(`${msg}${dist}`);
        }
        return;
      }
      if (data) {
        setResult(data as ZoneResult);
      }
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">Calcular Entrega</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Digite seu CEP</label>
            <div className="relative">
              <input
                type="text"
                value={cep}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 8);
                  setCep(v);
                  if (v.length < 8) reset();
                }}
                placeholder="00000-000"
                maxLength={9}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg font-medium focus:outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-100 pr-10"
              />
              {loading && <Loader2 size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
            </div>
          </div>

          <button
            onClick={handleCalculate}
            disabled={loading || cep.replace(/\D/g, '').length !== 8}
            className="w-full bg-black text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Calculando...</> : 'Calcular'}
          </button>

          {/* Bairro/endereço detectado */}
          {(bairro || logradouro) && (
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-xl px-4 py-2.5">
              <MapPin size={14} className="text-gray-400 flex-shrink-0" />
              <span>{[logradouro, bairro].filter(Boolean).join(' — ')}</span>
            </div>
          )}

          {/* Erro */}
          {error && !result && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
              <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Resultado real */}
          {result && (
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Truck size={20} className="text-[#0EAD69]" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Zona de entrega</p>
                  <p className="font-bold text-gray-900">{result.zone_name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
                  <p className="text-xs text-gray-500 mb-1">Taxa de entrega</p>
                  <p className="font-black text-[#0EAD69] text-lg">
                    {result.delivery_fee === 0 ? '🎉 Grátis' : formatCurrency(result.delivery_fee)}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
                  <p className="text-xs text-gray-500 mb-1">Tempo estimado</p>
                  <p className="font-black text-gray-900 text-lg">~{result.estimated_minutes} min</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 text-center">
                {(result.distance_meters / 1000).toFixed(1)} km de distância
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Store info modal ──────────────────────────────────────────────────────────
function StoreInfoModal({ isOpen, onClose, settings }: {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings | null;
}) {
  if (!isOpen) return null;

  const items = [
    settings?.address_display && { icon: MapPin, title: 'Endereço', text: settings.address_display },
    settings?.opening_hours   && { icon: Clock,  title: 'Horário',   text: settings.opening_hours },
    (settings?.whatsapp_number || settings?.phone_number) && {
      icon: Phone, title: 'Contato',
      text: [
        settings?.whatsapp_number ? `WhatsApp: ${formatPhone(settings.whatsapp_number)}` : null,
        settings?.phone_number    ? `Telefone: ${formatPhone(settings.phone_number)}` : null,
      ].filter(Boolean).join('\n'),
    },
    settings?.delivery_info && { icon: Bike, title: 'Entrega', text: settings.delivery_info },
    (settings?.min_order_value ?? 0) > 0 && {
      icon: Package, title: 'Pedido Mínimo',
      text: `R$ ${(settings?.min_order_value ?? 0).toFixed(2).replace('.', ',')}`,
    },
  ].filter(Boolean) as { icon: React.ElementType; title: string; text: string }[];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">Informações da Loja</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          {items.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">Nenhuma informação configurada ainda.</p>
          ) : items.map(item => (
            <div key={item.title} className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                <item.icon size={20} className="text-[#0EAD69]" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{item.title}</p>
                {item.text.split('\n').map((line, i) => <p key={i} className="text-gray-600 text-sm">{line}</p>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function fmtCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function discountedPrice(base: number, type: DailySpecial['discount_type'], value: number) {
  if (type === 'percentage') return base * (1 - value / 100);
  if (type === 'fixed') return Math.max(0, base - value);
  return base;
}

// ── Promo modal ───────────────────────────────────────────────────────────────
function PromoModal({ promo, onClose }: { promo: Promotion | null; onClose: () => void }) {
  if (!promo) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl animate-slide-up overflow-hidden">
        <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
          <Image src={promo.image_url || '/banner.png'} alt={promo.title} fill className="object-cover" />
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center"><X size={16} /></button>
        </div>
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">{promo.title}</h2>
          <p className="text-gray-600 leading-relaxed">{promo.description}</p>
          <button onClick={onClose} className="w-full mt-6 bg-black text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors">Entendi!</button>
        </div>
      </div>
    </div>
  );
}

// ── Category dropdown ─────────────────────────────────────────────────────────
function CategoryDropdown({ isOpen, onClose, selectedCategory, onSelect, categories }: {
  isOpen: boolean; onClose: () => void; selectedCategory: string | null; onSelect: (id: string | null) => void; categories: Category[];
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-b-2xl max-h-[70vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Categorias</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto">
          <button onClick={() => { onSelect(null); onClose(); }} className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${!selectedCategory ? 'bg-gray-50' : ''}`}>
            <span className={`text-sm font-medium ${!selectedCategory ? 'text-[#0EAD69]' : 'text-gray-700'}`}>Todas as categorias</span>
            {!selectedCategory && <Check size={16} className="text-[#0EAD69] ml-auto" />}
          </button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => { onSelect(cat.id); onClose(); }} className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${selectedCategory === cat.id ? 'bg-gray-50' : ''}`}>
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                <Image src={cat.image_url || '/logo.png'} alt={cat.name} width={40} height={40} className="w-full h-full object-contain p-1" />
              </div>
              <span className={`text-sm font-medium flex-1 text-left ${selectedCategory === cat.id ? 'text-[#0EAD69]' : 'text-gray-700'}`}>{cat.name}</span>
              {selectedCategory === cat.id && <Check size={16} className="text-[#0EAD69]" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Daily Promo CTA Modal ───────────────────────────────────────────────────
function DailyPromoModal({
  isOpen, onClose, dailySpecials, scheduledPromos, onOpenProduct,
}: {
  isOpen: boolean;
  onClose: () => void;
  dailySpecials: DailySpecial[];
  scheduledPromos: ScheduledPromo[];
  onOpenProduct: (p: Product) => void;
}) {
  if (!isOpen || (dailySpecials.length === 0 && scheduledPromos.length === 0)) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl animate-slide-up max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Flame size={20} className="text-white" />
            <h2 className="text-white font-black text-lg">Ofertas de Hoje!</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
            <X size={18} className="text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {/* Scheduled promotions for today */}
          {scheduledPromos.map(promo => (
            <div key={promo.id} className="rounded-2xl overflow-hidden border-2"
              style={{ borderColor: promo.color + '60', backgroundColor: promo.color + '10' }}>
              <div className="px-4 py-3 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: promo.color }}>
                  <Zap size={18} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-gray-900 text-sm">{promo.title}</p>
                  {promo.description && <p className="text-gray-600 text-xs mt-0.5 line-clamp-2">{promo.description}</p>}
                  <p className="text-xs text-gray-400 mt-1">{promo.start_time} – {promo.end_time}</p>
                  {promo.coupons && (
                    <div className="mt-2 inline-flex items-center gap-1.5 bg-white border border-dashed border-amber-400 rounded-lg px-2.5 py-1">
                      <Ticket size={12} className="text-amber-500" />
                      <span className="text-xs font-black text-amber-700 tracking-wide">{promo.coupons.code}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Daily specials products */}
          {dailySpecials.map(special => {
            const p = special.products;
            if (!p) return null;
            const variant = special.product_variants;
            const basePrice = variant?.price_override ?? p.base_price;
            const finalPrice = discountedPrice(basePrice, special.discount_type, special.discount_value);
            const hasDiscount = special.discount_type !== 'none';
            const imgUrl = variant?.image_url ?? p.product_variants?.[0]?.image_url ?? '/logo.png';
            const fullProduct: Product = { ...p, is_featured: false, category_id: null } as Product;
            return (
              <div key={special.id}
                onClick={() => { onOpenProduct(fullProduct); onClose(); }}
                className="cursor-pointer bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-2xl overflow-hidden hover:border-orange-400 transition-all flex gap-3 p-3">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-white">
                  <Image src={imgUrl} alt={p.name} fill className="object-contain p-1" />
                  {hasDiscount && (
                    <span className="absolute top-1 left-1 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                      {special.discount_type === 'percentage' ? `-${special.discount_value}%` : `-${fmtCurrency(special.discount_value)}`}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="inline-flex items-center gap-1 bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase mb-1">
                    <Flame size={8} /> {special.highlight_label}
                  </span>
                  <p className="font-bold text-gray-900 text-sm leading-tight">{p.name}</p>
                  {variant && <p className="text-orange-600 text-xs">{variant.name}</p>}
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-base font-black text-orange-600">{fmtCurrency(finalPrice)}</span>
                    {hasDiscount && <span className="text-xs text-gray-400 line-through">{fmtCurrency(basePrice)}</span>}
                  </div>
                </div>
                <div className="flex items-center flex-shrink-0">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                    <ChevronRight size={16} className="text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose}
            className="w-full bg-black text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors">
            Ver cardápio completo
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Home page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'inicio' | 'promocoes' | 'pedidos' | 'perfil'>('inicio');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isDeliveryOpen, setIsDeliveryOpen] = useState(false);
  const [isStoreInfoOpen, setIsStoreInfoOpen] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<Promotion | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCouponBanner, setShowCouponBanner] = useState(false);

  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const isOpen = computeIsOpen(storeSettings);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [dailySpecials, setDailySpecials] = useState<DailySpecial[]>([]);
  const [scheduledPromos, setScheduledPromos] = useState<ScheduledPromo[]>([]);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const { supabase, user, profile } = useAuth();
  const cart = useCart();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const todayDate = new Date();
      const todayISO = `${todayDate.getFullYear()}-${String(todayDate.getMonth()+1).padStart(2,'0')}-${String(todayDate.getDate()).padStart(2,'0')}`;
      const todayDow = todayDate.getDay();

      const [settingsRes, promotionsRes, categoriesRes, productsRes, specialsRes, scheduledRes] = await Promise.all([
        supabase.from('store_settings').select('store_name,logo_url,cover_url,whatsapp_number,phone_number,address_display,opening_hours,min_order_value,delivery_info,is_open,promo_banner_enabled,promo_banner_text,promo_banner_bg_color,open_time,close_time,open_days').eq('id', 'default').single(),
        supabase.from('promotions').select('*').eq('active', true).order('sort_order'),
        supabase.from('categories').select('*').eq('active', true).order('sort_order'),
        supabase.from('products').select(`
          id, name, description, image_url, base_price, puffs, is_featured, category_id, sort_order,
          product_variants ( id, product_id, name, description, image_url, price_override, stock, active )
        `).eq('active', true).order('sort_order'),
        supabase.from('daily_specials')
          .select('*, products(id,name,description,base_price,puffs,product_variants(id,product_id,name,image_url,price_override,stock,active)), product_variants(id,product_id,name,image_url,price_override,stock,active)')
          .eq('active', true)
          .or(`scheduled_date.eq.${todayISO},day_of_week.eq.${todayDow}`),
        supabase.from('scheduled_promotions')
          .select('id,title,description,scheduled_date,start_time,end_time,color,active,promotion_id,coupon_id,coupons(code,description)')
          .eq('active', true)
          .eq('scheduled_date', todayISO),
      ]);

      if (settingsRes.data) {
        setStoreSettings(settingsRes.data as StoreSettings);
        setShowCouponBanner(settingsRes.data.promo_banner_enabled ?? false);
      }
      if (promotionsRes.data) setPromotions(promotionsRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (specialsRes.data) {
        const raw = specialsRes.data as DailySpecial[];
        // Prefer scheduled_date over day_of_week for same product
        const exact = raw.filter(s => s.products !== null);
        const dateSpecials = exact.filter(s => (s as any).scheduled_date === todayISO);
        const dateProductIds = new Set(dateSpecials.map(s => s.product_id));
        const dowSpecials = exact.filter(s => !(s as any).scheduled_date && !dateProductIds.has(s.product_id));
        setDailySpecials([...dateSpecials, ...dowSpecials]);
      }
      if (scheduledRes.data) setScheduledPromos(scheduledRes.data as ScheduledPromo[]);

      if (productsRes.data) {
        // Filtra variantes com estoque > 0 e ativas; remove produtos sem variantes disponíveis
        const filtered = (productsRes.data as Product[])
          .map(p => ({
            ...p,
            product_variants: p.product_variants.filter(v => v.active && v.stock > 0),
          }))
          .filter(p => p.product_variants.length > 0);
        setAllProducts(filtered);
      }
      setLoading(false);
    }
    fetchData().then(() => {
      // Show promo modal on first load if not already dismissed this session
      if (!sessionStorage.getItem('promoModalDismissed')) {
        setShowPromoModal(true);
      }
    });
  }, [supabase]);

  const filteredProducts = useMemo(() => allProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  }), [allProducts, searchQuery, selectedCategory]);

  const featuredProducts = useMemo(() => allProducts.filter(p => p.is_featured), [allProducts]);

  const selectedCategoryName = selectedCategory
    ? categories.find(c => c.id === selectedCategory)?.name || 'Categoria'
    : 'Lista de categorias';

  const handleOpenProduct = useCallback((product: Product) => {
    setSelectedProduct(product);
  }, []);

  const renderInicio = () => (
    <div className="pb-20 lg:pb-8">

      {/* ── Promo banner — mobile only ────────────────────────────────────── */}
      {showCouponBanner && (
        <div
          className="lg:hidden flex items-center gap-3 text-white px-4 py-3"
          style={{ backgroundColor: storeSettings?.promo_banner_bg_color || '#0EAD69' }}
        >
          <Ticket size={18} className="flex-shrink-0" />
          <p className="flex-1 text-sm font-semibold">
            {storeSettings?.promo_banner_text || 'Temos cupons disponíveis! Aproveite nos descontos.'}
          </p>
          <button onClick={() => setShowCouponBanner(false)} className="p-1 rounded-full hover:bg-white/20 transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Store header — mobile only ──────────────────────────────────── */}
      <div className="lg:hidden">
        <div className="relative w-full" style={{ aspectRatio: '1280/466' }}>
          <Image src={storeSettings?.cover_url || '/banner.png'} alt="Banner" fill sizes="100vw" className="object-cover" priority />
        </div>
        <div className="mx-3 -mt-5 bg-white rounded-2xl border border-gray-100 shadow-sm relative z-[1]">
          <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-10">
            <div className="w-[72px] h-[72px] rounded-full border-4 border-white overflow-hidden shadow-lg bg-white">
              <Image src={storeSettings?.logo_url || '/logo.png'} alt="Logo" width={72} height={72} className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="pt-11 pb-4 px-4 text-center">
            <h1 className="text-lg font-bold text-gray-900 mb-1">{storeSettings?.store_name || ''}</h1>
            <div className="flex items-center justify-center gap-1.5 text-gray-500 text-xs mb-2">
              <MapPin size={12} className="text-gray-400 flex-shrink-0" />
              <span>{storeSettings?.address_display || 'Londrina - PR'}</span>
              <span className="text-gray-300">•</span>
              <button onClick={() => setIsStoreInfoOpen(true)} className="text-[#0EAD69] font-semibold">Mais informações</button>
            </div>
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${isOpen ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-green-500' : 'bg-red-500'}`} />
              {isOpen
                ? `Aberto${storeSettings?.opening_hours ? ` · ${storeSettings.opening_hours}` : ''}`
                : `Fechado · Abre às ${storeSettings?.open_time || storeSettings?.opening_hours || '09h00'}`}
            </span>
          </div>
        </div>
      </div>

      {/* ── Delivery Calculator — mobile only ────────────────────────────── */}
      <div className="mx-3 mt-3 lg:hidden">
        <button onClick={() => setIsDeliveryOpen(true)}
          className="w-full flex items-center justify-between px-4 py-4 bg-white rounded-2xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors active:scale-[0.99]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
              <MapPin size={18} className="text-gray-600" />
            </div>
            <span className="font-semibold text-gray-800 text-sm">Calcular taxa e tempo de entrega</span>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </button>
      </div>

      {/* ── Loyalty Program — mobile only ────────────────────────────────── */}
      <div className="mx-3 mt-3 mb-1 lg:hidden">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center flex-shrink-0">
              <Gift size={18} className="text-white" />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">Programa de fidelidade</h3>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">
            A cada <strong>R$ 1,00</strong> em compras você ganha <strong>1 ponto</strong> que pode ser trocado por prêmios.
          </p>
        </div>
      </div>

      {/* ── Mobile search + category filter ──────────────────────────────── */}
      <div className="px-3 mt-3 mb-3 flex items-center gap-2 lg:hidden">
        <button onClick={() => setIsCategoryDropdownOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2.5 bg-white border border-gray-100 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm flex-shrink-0">
          <span className="max-w-[110px] truncate text-xs">
            {selectedCategoryName === 'Lista de categorias' ? 'Categorias' : selectedCategoryName.split(' ').slice(0, 3).join(' ')}
          </span>
          <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
        </button>
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Busque por um produto"
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-gray-300 shadow-sm" />
        </div>
      </div>

      {/* ── Desktop: store section (banner + info) ───────────────────────── */}
      <div className="hidden lg:block -mx-8">
        <div className="relative w-full" style={{ aspectRatio: '1280/380' }}>
          <Image src={storeSettings?.cover_url || '/banner.png'} alt="Banner" fill sizes="100vw" className="object-cover" priority />
        </div>
        <div className="bg-white border-b border-gray-200">
          <div className="px-8 py-4 flex items-end gap-4">
            <div className="-mt-10 flex-shrink-0 relative z-10">
              <div className="w-20 h-20 rounded-2xl border-4 border-white overflow-hidden shadow-lg bg-white">
                <Image src={storeSettings?.logo_url || '/logo.png'} alt="Logo" width={80} height={80} className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="flex-1 pb-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900">{storeSettings?.store_name || ''}</h1>
              <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5 flex-wrap">
                <MapPin size={13} className="text-gray-400 flex-shrink-0" />
                <span>{storeSettings?.address_display || 'Londrina - PR'}</span>
                <span className="text-gray-300">•</span>
                <button onClick={() => setIsStoreInfoOpen(true)} className="text-[#0EAD69] font-semibold hover:underline flex-shrink-0">
                  Mais informações
                </button>
              </div>
            </div>
            <div className="pb-1 flex-shrink-0">
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${isOpen ? 'text-green-700' : 'text-red-600'}`}>
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isOpen ? 'bg-green-500' : 'bg-red-500'}`} />
                {isOpen
                  ? `Aberto${storeSettings?.opening_hours ? ` · ${storeSettings.opening_hours}` : ''}`
                  : `Fechado · Abre às ${storeSettings?.open_time || storeSettings?.opening_hours || '09h00'}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Desktop: sticky sub-header (categories + search) ────────────── */}
      <div className="hidden lg:flex sticky top-16 z-30 -mx-8 bg-white border-b border-gray-100 shadow-sm items-center gap-3 px-8 py-3">
        <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100 bg-gray-50">
          <Image src={storeSettings?.logo_url || '/logo.png'} alt="Logo" width={32} height={32} className="w-full h-full object-cover" />
        </div>
        <button onClick={() => setIsCategoryDropdownOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex-shrink-0">
          <span className="max-w-[160px] truncate">{selectedCategoryName}</span>
          <ChevronDown size={14} className="text-gray-400" />
        </button>
        <div className="flex-1 relative max-w-lg">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Busque por um produto"
            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-colors" />
        </div>
      </div>

      {/* ── Main layout: content + right sidebar ─────────────────────────── */}
      <div className="lg:flex lg:gap-6 lg:mt-6">

        {/* Content area */}
        <div className="flex-1 min-w-0">

          {/* Promotions */}
          {!searchQuery && !selectedCategory && promotions.length > 0 && (
            <>
              {/* Mobile: horizontal scroll */}
              <div className="mb-4 lg:hidden overflow-x-auto no-scrollbar">
                <div className="flex gap-3 px-3 pb-1" style={{ width: 'max-content' }}>
                  {promotions.map(promo => (
                    <div key={promo.id} onClick={() => setSelectedPromo(promo)}
                      className="cursor-pointer rounded-xl overflow-hidden shadow-sm w-[190px] flex-shrink-0">
                      <div className="relative" style={{ aspectRatio: '4/3' }}>
                        <Image src={promo.image_url || '/banner.png'} alt={promo.title} fill className="object-cover" />
                      </div>
                      <div className="p-2.5 bg-white border border-gray-100 border-t-0 rounded-b-xl">
                        <h3 className="font-bold text-gray-900 text-xs leading-tight uppercase line-clamp-2">{promo.title}</h3>
                        <p className="text-gray-500 text-[10px] mt-1 line-clamp-2 leading-tight">{promo.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Desktop: 3-col grid */}
              <div className="hidden lg:grid grid-cols-3 gap-3 mb-6">
                {promotions.map(promo => (
                  <div key={promo.id} onClick={() => setSelectedPromo(promo)}
                    className="cursor-pointer rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="relative" style={{ aspectRatio: '4/3' }}>
                      <Image src={promo.image_url || '/banner.png'} alt={promo.title} fill className="object-cover" />
                    </div>
                    <div className="p-2.5 bg-white border border-gray-100 border-t-0 rounded-b-xl">
                      <h3 className="font-bold text-gray-900 text-xs leading-tight uppercase">{promo.title}</h3>
                      <p className="text-gray-500 text-xs mt-1 line-clamp-2 leading-tight">{promo.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Produto do Dia */}
          {!searchQuery && !selectedCategory && dailySpecials.length > 0 && (
            <div className="mb-6 px-3 lg:px-0">
              <div className="flex items-center gap-2 mb-3">
                <Flame size={18} className="text-orange-500" />
                <h2 className="text-lg font-bold text-gray-900">Produto do Dia</h2>
              </div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar lg:grid lg:grid-cols-3 lg:overflow-visible pb-1">
                {dailySpecials.map(special => {
                  const p = special.products;
                  if (!p) return null;
                  const variant = special.product_variants;
                  const basePrice = variant?.price_override ?? p.base_price;
                  const finalPrice = discountedPrice(basePrice, special.discount_type, special.discount_value);
                  const hasDiscount = special.discount_type !== 'none';
                  const imgUrl = variant?.image_url ?? p.product_variants?.[0]?.image_url ?? '/logo.png';
                  const fullProduct: Product = { ...p, is_featured: false, category_id: null } as Product;
                  return (
                    <div key={special.id} onClick={() => handleOpenProduct(fullProduct)}
                      className="flex-shrink-0 w-[200px] lg:w-auto cursor-pointer bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-orange-400 transition-all">
                      <div className="relative" style={{ aspectRatio: '4/3' }}>
                        <Image src={imgUrl} alt={p.name} fill className="object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        <span className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wide">
                          <Flame size={9} /> {special.highlight_label}
                        </span>
                        {hasDiscount && (
                          <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                            {special.discount_type === 'percentage' ? `-${special.discount_value}%` : `-${fmtCurrency(special.discount_value)}`}
                          </span>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="font-bold text-gray-900 text-sm leading-tight">{p.name}</p>
                        {variant && <p className="text-orange-600 text-xs font-medium mt-0.5">{variant.name}</p>}
                        <div className="flex items-baseline gap-2 mt-2">
                          <span className="text-base font-black text-orange-600">{fmtCurrency(finalPrice)}</span>
                          {hasDiscount && <span className="text-xs text-gray-400 line-through">{fmtCurrency(basePrice)}</span>}
                        </div>
                        <button className="mt-2 w-full flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs py-2 rounded-xl transition-colors">
                          <Zap size={12} /> Ver oferta
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Featured products (Destaques) */}
          {!searchQuery && !selectedCategory && featuredProducts.length > 0 && (
            <>
              {/* Mobile: horizontal scroll */}
              <div className="mb-6 lg:hidden">
                <div className="px-3 mb-3"><h2 className="text-lg font-bold text-gray-900">Destaques</h2></div>
                <div className="overflow-x-auto no-scrollbar">
                  <div className="flex gap-3 px-3 pb-2" style={{ width: 'max-content' }}>
                    {featuredProducts.map(product => (
                      <div key={product.id} className="w-[155px] flex-shrink-0">
                        <ProductCard product={product} onOpen={handleOpenProduct} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Desktop: grid */}
              <div className="hidden lg:block mb-6">
                <h2 className="text-lg font-bold text-gray-900 mb-3">Destaques</h2>
                {loading ? (
                  <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map(i => <div key={i} className="bg-gray-100 rounded-xl aspect-square animate-pulse" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
                    {featuredProducts.map(product => <ProductCard key={product.id} product={product} onOpen={handleOpenProduct} />)}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Categories / All products */}
          {!searchQuery && !selectedCategory && (
            <>
              {/* Mobile: 2-col product grid */}
              <div className="px-3 mb-6 lg:hidden">
                <h2 className="text-lg font-bold text-gray-900 mb-3">Categorias</h2>
                {loading ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map(i => <div key={i} className="bg-gray-100 rounded-xl aspect-square animate-pulse" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {allProducts.map(product => <ProductCard key={product.id} product={product} onOpen={handleOpenProduct} />)}
                  </div>
                )}
              </div>
              {/* Desktop: 4-col product grid */}
              <div className="hidden lg:block mb-6">
                <h2 className="text-lg font-bold text-gray-900 mb-3">Categorias</h2>
                {loading ? (
                  <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map(i => <div key={i} className="bg-gray-100 rounded-xl aspect-square animate-pulse" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
                    {allProducts.map(product => <ProductCard key={product.id} product={product} onOpen={handleOpenProduct} />)}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Search / Category Results */}
          {(searchQuery || selectedCategory) && (
            <div className="px-3 lg:px-0 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-gray-900">
                  {searchQuery ? `"${searchQuery}"` : selectedCategoryName.split(' ').slice(0, 4).join(' ')}
                </h2>
                <button onClick={() => { setSearchQuery(''); setSelectedCategory(null); }} className="text-[#0EAD69] text-sm font-medium">Limpar</button>
              </div>
              {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map(i => <div key={i} className="bg-gray-100 rounded-xl aspect-square animate-pulse" />)}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                  <Search size={40} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Nenhum produto disponível</p>
                  <p className="text-gray-400 text-sm mt-1">Tente outra busca ou categoria</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filteredProducts.map(product => <ProductCard key={product.id} product={product} onOpen={handleOpenProduct} />)}
                </div>
              )}
            </div>
          )}

        </div>{/* end content area */}

        {/* ── Desktop right sidebar ─────────────────────────────────────── */}
        <aside className="hidden lg:block w-72 flex-shrink-0">
          <div className="sticky top-[120px] space-y-3">

            {/* Loyalty program */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                  <Gift size={18} className="text-white" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">Programa de fidelidade</h3>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                A cada <strong>R$ 1,00</strong> em compras você ganha <strong>1 ponto</strong> que pode ser trocado por prêmios.
              </p>
            </div>

            {/* Delivery calc */}
            <button onClick={() => setIsDeliveryOpen(true)}
              className="w-full flex items-center justify-between bg-white rounded-2xl px-4 py-4 border border-gray-100 shadow-sm hover:bg-gray-50 transition-colors text-left">
              <div className="flex items-center gap-3">
                <MapPin size={18} className="text-gray-500 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-800">Calcular taxa e tempo de entrega</span>
              </div>
              <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
            </button>

            {/* Cart (sacola) */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {cart.totalItems === 0 ? (
                <div className="flex flex-col items-center py-8 text-center px-4">
                  <ShoppingBag size={52} className="text-gray-200 mb-2" />
                  <p className="text-gray-500 font-semibold text-sm">Sacola vazia</p>
                </div>
              ) : (
                <div>
                  <div className="p-4 space-y-3 max-h-60 overflow-y-auto">
                    {cart.items.map(item => (
                      <div key={item.variantId} className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                          <Image src={item.imageUrl || '/logo.png'} alt={item.productName} width={40} height={40} className="w-full h-full object-contain p-1" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 line-clamp-1">{item.productName}</p>
                          <p className="text-xs text-[#0EAD69] font-medium">{formatCurrency(item.unitPrice)}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => cart.updateQty(item.variantId, item.quantity - 1)} className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100"><Minus size={10} /></button>
                          <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                          <button onClick={() => cart.updateQty(item.variantId, item.quantity + 1)} disabled={item.quantity >= item.stock} className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center disabled:bg-gray-200 disabled:cursor-not-allowed"><Plus size={10} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 pb-4 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-600 font-medium">Total</span>
                      <span className="font-bold text-gray-900">{formatCurrency(cart.totalPrice)}</span>
                    </div>
                    <button
                      disabled={!isOpen}
                      onClick={() => isOpen && setIsCheckoutOpen(true)}
                      className={`w-full font-bold py-3 rounded-xl text-sm transition-colors ${isOpen ? 'bg-black text-white hover:bg-gray-800' : 'bg-gray-200 text-gray-500 cursor-default'}`}>
                      {isOpen ? 'Finalizar Pedido' : `Fechado · Abre às ${storeSettings?.open_time || '09h00'}`}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Promo banner */}
            {storeSettings?.promo_banner_enabled && (
              <button onClick={() => setIsCheckoutOpen(true)} className="w-full flex items-center justify-between bg-white rounded-2xl px-4 py-4 border border-gray-100 shadow-sm hover:bg-gray-50 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <Ticket size={18} className="flex-shrink-0" style={{ color: storeSettings.promo_banner_bg_color || '#0EAD69' }} />
                  <p className="text-sm font-semibold text-gray-800">
                    {storeSettings.promo_banner_text || 'Temos cupons disponíveis!'}
                  </p>
                </div>
                <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
              </button>
            )}

            {/* Store status button */}
            <button
              disabled={!isOpen}
              onClick={() => isOpen && setIsCheckoutOpen(true)}
              className={`w-full py-4 rounded-2xl font-bold text-sm transition-colors ${
                isOpen
                  ? 'bg-[#0EAD69] text-white hover:bg-green-600 cursor-pointer'
                  : 'bg-gray-200 text-gray-500 cursor-default'
              }`}>
              {isOpen
                ? 'Estabelecimento aberto'
                : `Fechado · Abre às ${storeSettings?.open_time || '09h00'}`}
            </button>

          </div>
        </aside>

      </div>{/* end main layout flex */}
    </div>
  );

  const renderPromocoes = () => (
    <div className="pb-20 lg:pb-8">
      <div className="px-4 lg:px-0 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Promoções</h1>
        <p className="text-gray-500 text-sm">Aproveite nossas ofertas exclusivas</p>
      </div>

      {/* Produto do Dia */}
      {dailySpecials.length > 0 && (
        <div className="px-4 lg:px-0 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Flame size={20} className="text-orange-500" />
            <h2 className="text-lg font-bold text-gray-900">Produto do Dia</h2>
            <span className="text-xs bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-full ml-1">HOJE</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dailySpecials.map(special => {
              const p = special.products;
              if (!p) return null;
              const variant = special.product_variants;
              const basePrice = variant?.price_override ?? p.base_price;
              const finalPrice = discountedPrice(basePrice, special.discount_type, special.discount_value);
              const hasDiscount = special.discount_type !== 'none';
              const imgUrl = variant?.image_url ?? p.product_variants?.[0]?.image_url ?? '/logo.png';
              const fullProduct: Product = { ...p, is_featured: false, category_id: null } as Product;
              return (
                <div key={special.id} onClick={() => handleOpenProduct(fullProduct)}
                  className="cursor-pointer bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:border-orange-400 transition-all">
                  <div className="relative" style={{ aspectRatio: '16/9' }}>
                    <Image src={imgUrl} alt={p.name} fill className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                      <div>
                        <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 w-fit uppercase">
                          <Flame size={9} /> {special.highlight_label}
                        </span>
                        <p className="text-white font-bold text-sm mt-1 drop-shadow">{p.name}</p>
                        {variant && <p className="text-orange-200 text-xs">{variant.name}</p>}
                      </div>
                      <div className="text-right">
                        {hasDiscount && (
                          <p className="text-gray-300 text-xs line-through">{fmtCurrency(basePrice)}</p>
                        )}
                        <p className="text-white font-black text-lg drop-shadow">{fmtCurrency(finalPrice)}</p>
                      </div>
                    </div>
                    {hasDiscount && (
                      <span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-black px-2 py-1 rounded-xl">
                        {special.discount_type === 'percentage' ? `-${special.discount_value}%` : `-${fmtCurrency(special.discount_value)}`}
                      </span>
                    )}
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between">
                    <p className="text-xs text-gray-500">Clique para ver detalhes</p>
                    <button className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs py-1.5 px-3 rounded-xl transition-colors">
                      <Zap size={11} /> Ver oferta
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Promotion banners */}
      {promotions.length > 0 && (
        <div className="px-4 lg:px-0 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Ofertas em Destaque</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {promotions.map(promo => (
              <div key={promo.id} onClick={() => setSelectedPromo(promo)} className="cursor-pointer rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5">
                <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
                  <Image src={promo.image_url || '/banner.png'} alt={promo.title} fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="font-black text-white text-base uppercase drop-shadow">{promo.title}</h3>
                    {promo.description && <p className="text-white/80 text-xs mt-0.5 line-clamp-2">{promo.description}</p>}
                  </div>
                </div>
                <div className="px-4 py-3 bg-white border border-gray-100 border-t-0 rounded-b-2xl flex items-center justify-between">
                  <p className="text-xs text-gray-400">Toque para ver mais</p>
                  <button className="text-[#0EAD69] font-semibold text-sm flex items-center gap-1">Ver detalhes <ChevronRight size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Promoções agendadas do dia */}
      {scheduledPromos.length > 0 && (
        <div className="px-4 lg:px-0 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={20} className="text-purple-500" />
            <h2 className="text-lg font-bold text-gray-900">Promoções de Hoje</h2>
          </div>
          <div className="space-y-3">
            {scheduledPromos.map(promo => (
              <div key={promo.id} className="rounded-2xl overflow-hidden border-2 p-4 flex items-start gap-4"
                style={{ borderColor: promo.color + '60', backgroundColor: promo.color + '10' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: promo.color }}>
                  <Zap size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-black text-gray-900">{promo.title}</p>
                  {promo.description && <p className="text-gray-600 text-sm mt-1">{promo.description}</p>}
                  <p className="text-xs text-gray-400 mt-1">{promo.start_time} – {promo.end_time}</p>
                  {promo.coupons && (
                    <div className="mt-2 inline-flex items-center gap-1.5 bg-white border border-dashed border-amber-400 rounded-lg px-3 py-1.5">
                      <Ticket size={13} className="text-amber-500" />
                      <span className="text-sm font-black text-amber-700 tracking-wide">{promo.coupons.code}</span>
                      {promo.coupons.description && <span className="text-xs text-gray-500 ml-1">— {promo.coupons.description}</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {promotions.length === 0 && dailySpecials.length === 0 && scheduledPromos.length === 0 && (
        <div className="px-4 lg:px-0 text-center py-12">
          <Tag size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhuma promoção ativa no momento</p>
          <p className="text-gray-400 text-sm mt-1">Fique de olho! Novas ofertas aparecem em breve.</p>
        </div>
      )}

      {featuredProducts.length > 0 && (
        <div className="px-4 lg:px-0 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Produtos em Destaque</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {featuredProducts.map(product => <ProductCard key={product.id} product={product} onOpen={handleOpenProduct} />)}
          </div>
        </div>
      )}
    </div>
  );

  const renderPedidos = () => <OrdersTab setActiveTab={setActiveTab} />;

  const NAV_TABS = [
    { id: 'inicio',    icon: Home,       label: 'Início' },
    { id: 'promocoes', icon: Tag,        label: 'Promoções' },
    { id: 'pedidos',   icon: ShoppingBag, label: 'Pedidos' },
    { id: 'perfil',    icon: User,       label: 'Perfil' },
  ] as const;

  return (
    <div className="relative min-h-screen bg-[#f5f5f5]">

      {/* ── Desktop Header (lg+) ─────────────────────────────────────────── */}
      <header className="hidden lg:flex fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 shadow-sm h-16 items-center">
        <div className="max-w-7xl mx-auto w-full flex items-center gap-1 px-8">

          {/* Nav tabs — Início, Promoções, Pedidos */}
          <nav className="flex items-center gap-0.5">
            {NAV_TABS.slice(0, 3).map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  activeTab === tab.id ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}>
                <tab.icon size={15} />
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex-1" />

          {/* User / Entrar */}
          <button onClick={() => setActiveTab('perfil')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === 'perfil' ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
            }`}>
            <User size={15} />
            {user ? (profile?.full_name?.split(' ')[0] || 'Perfil') : 'Entrar/Cadastrar'}
          </button>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="max-w-2xl mx-auto lg:max-w-7xl lg:px-8 lg:pt-16">
        {activeTab === 'inicio' && renderInicio()}
        {activeTab === 'promocoes' && renderPromocoes()}
        {activeTab === 'pedidos' && renderPedidos()}
        {activeTab === 'perfil' && <ProfileTab />}
      </main>

      {/* ── Bottom Navigation (mobile only) ─────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex items-center z-40 h-[70px] max-w-2xl mx-auto shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
        {NAV_TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-2 transition-colors ${activeTab === tab.id ? 'text-black' : 'text-gray-400'}`}>
            <tab.icon size={22} strokeWidth={activeTab === tab.id ? 2.5 : 1.5} />
            <span className="text-[10px] font-semibold">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* ── Cart FAB (mobile only) ───────────────────────────────────────── */}
      {cart.totalItems > 0 && (
        <button onClick={() => setIsCartOpen(true)}
          className="lg:hidden fixed bottom-[82px] right-4 bg-black text-white rounded-2xl shadow-xl flex items-center gap-2 px-4 py-3 z-30 hover:bg-gray-800 transition-colors">
          <ShoppingBag size={18} />
          <span className="text-sm font-bold">{cart.totalItems} {cart.totalItems === 1 ? 'item' : 'itens'}</span>
          <span className="text-gray-400 text-sm">·</span>
          <span className="text-sm font-bold">{formatCurrency(cart.totalPrice)}</span>
        </button>
      )}

      {/* Modals */}
      <CartModal isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={cart.items} onUpdateQuantity={cart.updateQty} onRemove={cart.removeItem} onCheckout={() => { setIsCartOpen(false); if (isOpen) setIsCheckoutOpen(true); }} />
      <DailyPromoModal
        isOpen={showPromoModal}
        onClose={() => { setShowPromoModal(false); sessionStorage.setItem('promoModalDismissed', '1'); }}
        dailySpecials={dailySpecials}
        scheduledPromos={scheduledPromos}
        onOpenProduct={handleOpenProduct}
      />
      <CheckoutFlow isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} />
      <DeliveryModal isOpen={isDeliveryOpen} onClose={() => setIsDeliveryOpen(false)} />
      <StoreInfoModal isOpen={isStoreInfoOpen} onClose={() => setIsStoreInfoOpen(false)} settings={storeSettings} />
      <PromoModal promo={selectedPromo} onClose={() => setSelectedPromo(null)} />
      <CategoryDropdown isOpen={isCategoryDropdownOpen} onClose={() => setIsCategoryDropdownOpen(false)} selectedCategory={selectedCategory} onSelect={setSelectedCategory} categories={categories} />
      <ProductDetailSheet product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </div>
  );
}

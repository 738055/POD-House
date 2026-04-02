'use client';

import React, { useState, useEffect } from 'react';
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
  Ticket
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
};

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

interface ZoneResult {
  zone_name: string;
  delivery_fee: number;
  estimated_minutes: number;
  distance_meters: number;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ── Product card ─────────────────────────────────────────────────────────────
function ProductCard({ product, onOpen }: { product: Product; onOpen: (product: Product) => void }) {
  const activeVariants = product.product_variants.filter(v => v.active);
  const available = activeVariants.filter(v => v.stock > 0);
  const isOutOfStock = available.length === 0;

  const mainVariant = isOutOfStock ? activeVariants[0] : available[0];
  if (!mainVariant) return null;

  const allVariants = isOutOfStock ? activeVariants : available;
  const minPrice = Math.min(...allVariants.map(v => v.price_override ?? product.base_price));
  const hasMultiple = available.length > 1;
  const image = mainVariant.image_url ?? '/logo.png';

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
}

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
        settings?.whatsapp_number ? `WhatsApp: ${settings.whatsapp_number}` : null,
        settings?.phone_number    ? `Telefone: ${settings.phone_number}` : null,
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
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const { supabase } = useAuth();
  const cart = useCart();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [settingsRes, promotionsRes, categoriesRes, productsRes, couponsRes] = await Promise.all([
        supabase.from('store_settings').select('store_name,logo_url,cover_url,whatsapp_number,phone_number,address_display,opening_hours,min_order_value,delivery_info,is_open').eq('id', 'default').single(),
        supabase.from('promotions').select('*').eq('active', true).order('sort_order'),
        supabase.from('categories').select('*').eq('active', true).order('sort_order'),
        supabase.from('products').select(`
          id, name, description, base_price, puffs, is_featured, category_id, sort_order,
          product_variants ( id, product_id, name, image_url, price_override, stock, active )
        `).eq('active', true).order('sort_order'),
        supabase.from('coupons').select('id').eq('active', true).limit(1),
      ]);

      if (settingsRes.data) setStoreSettings(settingsRes.data as StoreSettings);
      if (promotionsRes.data) setPromotions(promotionsRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (couponsRes.data && couponsRes.data.length > 0) setShowCouponBanner(true);
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
    fetchData();
  }, [supabase]);

  const filteredProducts = allProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredProducts = allProducts.filter(p => p.is_featured);

  const selectedCategoryName = selectedCategory
    ? categories.find(c => c.id === selectedCategory)?.name || 'Categoria'
    : 'Lista de categorias';

  function handleOpenProduct(product: Product) {
    setSelectedProduct(product);
  }

  const renderInicio = () => (
    <div className="pb-20 lg:pb-8">

      {/* ── Coupon banner — mobile only ───────────────────────────────────── */}
      {showCouponBanner && (
        <div className="lg:hidden flex items-center gap-3 bg-[#0EAD69] text-white px-4 py-3">
          <Ticket size={18} className="flex-shrink-0" />
          <p className="flex-1 text-sm font-semibold">Temos cupons disponíveis! Aproveite nos descontos.</p>
          <button onClick={() => setShowCouponBanner(false)} className="p-1 rounded-full hover:bg-white/20 transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Store header — mobile only ──────────────────────────────────── */}
      <div className="lg:hidden">
        {/* Cover full-width */}
        <div className="relative w-full" style={{ aspectRatio: '1280/466' }}>
          <Image src={storeSettings?.cover_url || '/banner.png'} alt="Banner" fill className="object-cover" priority />
        </div>

        {/* White info card — overlaps cover by 20px, logo floats on top */}
        <div className="mx-3 -mt-5 bg-white rounded-2xl border border-gray-100 shadow-sm relative z-[1]">
          {/* Floating logo — positioned above this card, overlapping cover */}
          <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-10">
            <div className="w-[72px] h-[72px] rounded-full border-4 border-white overflow-hidden shadow-lg bg-white">
              <Image src={storeSettings?.logo_url || '/logo.png'} alt="Logo" width={72} height={72} className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="pt-11 pb-4 px-4 text-center">
            <h1 className="text-lg font-bold text-gray-900 mb-1">{storeSettings?.store_name || 'POD House'}</h1>
            <div className="flex items-center justify-center gap-1.5 text-gray-500 text-xs mb-2">
              <MapPin size={12} className="text-gray-400 flex-shrink-0" />
              <span>{storeSettings?.address_display || 'Londrina - PR'}</span>
              <span className="text-gray-300">•</span>
              <button onClick={() => setIsStoreInfoOpen(true)} className="text-[#0EAD69] font-semibold">Mais informações</button>
            </div>
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${storeSettings?.is_open !== false ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${storeSettings?.is_open !== false ? 'bg-green-500' : 'bg-red-500'}`} />
              {storeSettings?.is_open !== false
                ? `Aberto${storeSettings?.opening_hours ? ` · ${storeSettings.opening_hours}` : ''}`
                : 'Fechado no momento'}
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

      {/* ── Desktop layout: sidebar + content ───────────────────────────── */}
      <div className="lg:flex lg:gap-8 lg:mt-2">

        {/* Desktop sidebar — categories */}
        <aside className="hidden lg:block w-52 flex-shrink-0">
          {/* Store info card */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200 mb-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <p className={`text-xs font-bold flex items-center gap-1 ${storeSettings?.is_open !== false ? 'text-green-500' : 'text-red-400'}`}>
                <Clock size={11} />
                {storeSettings?.is_open !== false ? 'Aberto' : 'Fechado'}
              </p>
              {storeSettings?.opening_hours && (
                <span className="text-xs text-gray-400">{storeSettings.opening_hours}</span>
              )}
            </div>
            {storeSettings?.address_display && (
              <p className="text-xs text-gray-500 flex items-start gap-1">
                <MapPin size={11} className="mt-0.5 flex-shrink-0" />
                {storeSettings.address_display}
              </p>
            )}
            <button onClick={() => setIsStoreInfoOpen(true)} className="text-xs text-[#0EAD69] font-medium mt-2 hover:underline">
              Ver mais informações
            </button>
          </div>

          {/* Loyalty card */}
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-5 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Gift size={14} className="text-amber-500" />
              <p className="text-xs font-bold text-amber-700">Fidelidade</p>
            </div>
            <p className="text-xs text-amber-600 leading-relaxed">R$ 1 = 1 ponto · troque por prêmios</p>
          </div>

          {/* Categories list */}
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 px-1">Categorias</p>
          <div className="space-y-0.5">
            <button onClick={() => setSelectedCategory(null)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${!selectedCategory ? 'bg-black text-white' : 'text-gray-600 hover:bg-white hover:shadow-sm'}`}>
              Todos os produtos
            </button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${selectedCategory === cat.id ? 'bg-black text-white' : 'text-gray-600 hover:bg-white hover:shadow-sm'}`}>
                {cat.image_url && (
                  <div className="w-5 h-5 rounded overflow-hidden flex-shrink-0">
                    <Image src={cat.image_url} alt="" width={20} height={20} className="w-full h-full object-contain" />
                  </div>
                )}
                <span className="truncate">{cat.name}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main content area */}
        <div className="flex-1 min-w-0">

          {/* Promotions */}
          {!searchQuery && !selectedCategory && promotions.length > 0 && (
            <div className="px-4 lg:px-0 mb-6">
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {promotions.map(promo => (
                  <div key={promo.id} onClick={() => setSelectedPromo(promo)} className="cursor-pointer rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
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
            </div>
          )}

          {/* Featured Products */}
          {!searchQuery && !selectedCategory && featuredProducts.length > 0 && (
            <div className="px-4 lg:px-0 mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Destaques</h2>
              {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map(i => <div key={i} className="bg-gray-100 rounded-xl aspect-square animate-pulse" />)}
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {featuredProducts.map(product => <ProductCard key={product.id} product={product} onOpen={handleOpenProduct} />)}
                </div>
              )}
            </div>
          )}

          {/* Categories horizontal scroll — mobile only */}
          {!searchQuery && !selectedCategory && (
            <div className="mb-6 lg:hidden">
              <div className="px-4 mb-3"><h2 className="text-lg font-bold text-gray-900">Categorias</h2></div>
              <div className="overflow-x-auto no-scrollbar">
                <div className="flex gap-2 px-4 pb-2" style={{ width: 'max-content' }}>
                  {categories.slice(0, 12).map(cat => (
                    <div key={cat.id} onClick={() => setSelectedCategory(cat.id)} className="flex flex-col items-center gap-2 cursor-pointer p-2 rounded-xl hover:bg-gray-50">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-gray-200">
                        <Image src={cat.image_url || '/logo.png'} alt={cat.name} width={64} height={64} className="w-full h-full object-contain bg-gray-50 p-1" />
                      </div>
                      <p className="text-xs text-center font-medium leading-tight text-gray-700 w-16 line-clamp-2">{cat.name.split(' ').slice(0, 3).join(' ')}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* All products (desktop default) */}
          {!searchQuery && !selectedCategory && (
            <div className="hidden lg:block px-0 mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Todos os produtos</h2>
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
          )}

          {/* Search / Category Results */}
          {(searchQuery || selectedCategory) && (
            <div className="px-4 lg:px-0 mb-6">
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

        </div>{/* end main content */}
      </div>{/* end desktop flex */}
    </div>
  );

  const renderPromocoes = () => (
    <div className="pb-20 lg:pb-8">
      <div className="px-4 lg:px-0 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Promoções</h1>
        <p className="text-gray-500 text-sm">Aproveite nossas ofertas exclusivas</p>
      </div>
      <div className="px-4 lg:px-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {promotions.map(promo => (
          <div key={promo.id} onClick={() => setSelectedPromo(promo)} className="cursor-pointer rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-shadow">
            <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
              <Image src={promo.image_url || '/banner.png'} alt={promo.title} fill className="object-cover" />
            </div>
            <div className="p-4 bg-white border border-gray-100 border-t-0 rounded-b-2xl">
              <h3 className="font-bold text-gray-900 text-base uppercase mb-1">{promo.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed line-clamp-3">{promo.description}</p>
              <button className="mt-3 text-[#0EAD69] font-semibold text-sm flex items-center gap-1">Ver detalhes <ChevronRight size={14} /></button>
            </div>
          </div>
        ))}
      </div>
      {featuredProducts.length > 0 && (
        <div className="px-4 lg:px-0 mt-8 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Produtos em Promoção</h2>
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
        <div className="max-w-7xl mx-auto w-full flex items-center gap-4 px-8">

          {/* Logo + nome */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
              <Image src={storeSettings?.logo_url || '/logo.png'} alt="Logo" width={36} height={36} className="w-full h-full object-cover" />
            </div>
            <span className="font-black text-base text-gray-900 tracking-tight">{storeSettings?.store_name || 'POD House'}</span>
          </div>

          {/* Nav tabs */}
          <nav className="flex items-center gap-0.5 ml-6">
            {NAV_TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === tab.id ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}>
                <tab.icon size={15} />
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Search */}
          <div className="flex-1 max-w-sm relative ml-auto">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setActiveTab('inicio'); }}
              placeholder="Buscar produto..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400 bg-gray-50"
            />
          </div>

          {/* Entrega */}
          <button onClick={() => setIsDeliveryOpen(true)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors flex-shrink-0">
            <Bike size={16} className="text-[#0EAD69]" />
            Calcular entrega
          </button>

          {/* Cart */}
          <button onClick={() => setIsCartOpen(true)}
            className="relative flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl text-sm font-bold flex-shrink-0 hover:bg-gray-800 transition-colors">
            <ShoppingBag size={16} />
            {cart.totalItems > 0 ? (
              <>
                <span>{cart.totalItems} {cart.totalItems === 1 ? 'item' : 'itens'}</span>
                <span className="text-gray-400">·</span>
                <span>{formatCurrency(cart.totalPrice)}</span>
              </>
            ) : (
              <span>Carrinho</span>
            )}
            {cart.totalItems > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                {cart.totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="max-w-2xl mx-auto lg:max-w-7xl lg:px-8 lg:pt-20">
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
      <CartModal isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={cart.items} onUpdateQuantity={cart.updateQty} onRemove={cart.removeItem} onCheckout={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }} />
      <CheckoutFlow isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} />
      <DeliveryModal isOpen={isDeliveryOpen} onClose={() => setIsDeliveryOpen(false)} />
      <StoreInfoModal isOpen={isStoreInfoOpen} onClose={() => setIsStoreInfoOpen(false)} settings={storeSettings} />
      <PromoModal promo={selectedPromo} onClose={() => setSelectedPromo(null)} />
      <CategoryDropdown isOpen={isCategoryDropdownOpen} onClose={() => setIsCategoryDropdownOpen(false)} selectedCategory={selectedCategory} onSelect={setSelectedCategory} categories={categories} />
      <ProductDetailSheet product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </div>
  );
}

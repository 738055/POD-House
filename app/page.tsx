'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import {
  MapPin, ChevronRight, Clock, Search, ChevronDown,
  Home, Tag, ShoppingBag, User, X, Plus, Minus,
  Gift, Bike, Star, Phone, Info, Check, Package, LogOut,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Product, Category, Promotion, Neighborhood } from '@/lib/supabase/types';
import { useAuth } from '@/hooks/use-auth';
import { useCart } from '@/hooks/use-cart';
import ProductDetailSheet from '@/components/ProductDetailSheet';
import CheckoutFlow from '@/components/CheckoutFlow';
import AuthModal from '@/components/AuthModal';

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/* ─── Product Card ─── */
function ProductCard({ product, onTap }: { product: Product; onTap: (p: Product) => void }) {
  const variants = product.product_variants ?? [];
  const minPrice = variants.length
    ? Math.min(...variants.map(v => v.price_override ?? product.base_price))
    : product.base_price;
  const hasDiscount = false; // adicionar campo original_price futuramente

  return (
    <div onClick={() => onTap(product)}
      className="bg-white rounded-xl overflow-hidden cursor-pointer active:opacity-75 border border-gray-100 shadow-sm">
      <div className="relative bg-gray-50" style={{ aspectRatio: '1/1' }}>
        {(variants[0]?.image_url) ? (
          <Image src={variants[0].image_url} alt={product.name} fill className="object-contain p-2"
            sizes="(max-width:480px) 50vw, 200px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-200 text-4xl">📦</div>
        )}
        <div className="absolute top-2 right-2 w-6 h-6 bg-black rounded-full flex items-center justify-center">
          <Gift size={11} className="text-white" />
        </div>
        {variants.length > 1 && (
          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {variants.length} sabores
          </div>
        )}
      </div>
      <div className="p-2.5">
        <h3 className="text-[13px] font-bold text-gray-900 uppercase leading-tight mb-2" style={{ minHeight: '2.4rem' }}>
          {product.name}
        </h3>
        <p className="text-sm font-semibold text-gray-900">
          {variants.length > 1 ? `A partir de ${fmt(minPrice)}` : fmt(minPrice)}
        </p>
      </div>
    </div>
  );
}

/* ─── Category Tile ─── */
function CategoryTile({ category, onClick }: { category: Category; onClick: () => void }) {
  return (
    <div onClick={onClick}
      className="bg-white rounded-xl overflow-hidden cursor-pointer active:opacity-75 border border-gray-100 shadow-sm">
      <div className="relative bg-gray-50" style={{ aspectRatio: '1/1' }}>
        {category.image_url ? (
          <Image src={category.image_url} alt={category.name} fill className="object-contain p-2"
            sizes="(max-width:480px) 50vw, 200px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-200 text-4xl">📂</div>
        )}
      </div>
      <div className="p-2.5">
        <h3 className="text-[13px] font-bold text-gray-900 uppercase leading-tight">{category.name}</h3>
      </div>
    </div>
  );
}

/* ─── Cart Drawer ─── */
function CartDrawer({ isOpen, onClose, onCheckout }: { isOpen: boolean; onClose: () => void; onCheckout: () => void }) {
  const { items, updateQty, removeItem, totalPrice } = useCart();
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ maxWidth: '480px', left: 0, right: 0, margin: '0 auto' }}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-2xl max-h-[85vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold">Minha Sacola</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingBag size={48} className="text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Sacola vazia</p>
              <p className="text-gray-400 text-sm mt-1">Adicione produtos para continuar</p>
            </div>
          ) : items.map(item => (
            <div key={item.variantId} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-white border border-gray-100 flex-shrink-0">
                {item.imageUrl
                  ? <Image src={item.imageUrl} alt={item.variantName} width={56} height={56} className="w-full h-full object-contain p-1" />
                  : <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">📦</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-900 uppercase line-clamp-1">{item.productName}</p>
                <p className="text-xs text-gray-500">{item.variantName}</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{fmt(item.unitPrice)}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => item.quantity === 1 ? removeItem(item.variantId) : updateQty(item.variantId, item.quantity - 1)}
                  className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center"><Minus size={12} /></button>
                <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                <button onClick={() => updateQty(item.variantId, item.quantity + 1)}
                  className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center"><Plus size={12} /></button>
              </div>
            </div>
          ))}
        </div>
        {items.length > 0 && (
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600 font-medium">Subtotal</span>
              <span className="text-xl font-bold">{fmt(totalPrice)}</span>
            </div>
            <button onClick={onCheckout} className="w-full bg-black text-white font-bold py-4 rounded-xl active:opacity-80">
              Finalizar Pedido
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Delivery Modal ─── */
function DeliveryModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const supabase = createClient();
  const [cep, setCep] = useState('');
  const [result, setResult] = useState<{ neighborhood: string; fee: number; time: number } | null>(null);
  const [loading, setLoading] = useState(false);

  async function calculate() {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setLoading(true);
    const prefix = clean.slice(0, 5);
    const { data } = await supabase.from('neighborhoods').select('*')
      .or(`cep_prefix.eq.${prefix},cep_prefix.is.null`).order('cep_prefix', { ascending: false }).limit(1);
    if (data?.[0]) setResult({ neighborhood: data[0].name, fee: data[0].delivery_fee, time: data[0].estimated_minutes });
    else setResult({ neighborhood: 'Consulte por bairro', fee: 10, time: 60 });
    setLoading(false);
  }

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ maxWidth: '480px', left: 0, right: 0, margin: '0 auto' }}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-2xl p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">Calcular Entrega</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">CEP</label>
            <input type="text" value={cep} onChange={e => setCep(e.target.value.replace(/\D/g,'').slice(0,8))}
              placeholder="00000-000"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-lg font-medium focus:outline-none focus:border-black" />
          </div>
          <button onClick={calculate} disabled={loading}
            className="w-full bg-black text-white font-bold py-3 rounded-xl active:opacity-80">
            {loading ? 'Calculando...' : 'Calcular'}
          </button>
          {result && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center"><MapPin size={18} className="text-gray-700" /></div>
                <div><p className="text-xs text-gray-500">Bairro</p><p className="font-bold">{result.neighborhood}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center"><Bike size={18} className="text-gray-700" /></div>
                <div><p className="text-xs text-gray-500">Taxa de entrega</p><p className="font-bold">{result.fee === 0 ? 'Grátis' : fmt(result.fee)}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center"><Clock size={18} className="text-gray-700" /></div>
                <div><p className="text-xs text-gray-500">Tempo estimado</p><p className="font-bold">{result.time} minutos</p></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Store Info Modal ─── */
function StoreInfoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  const items = [
    { icon: MapPin, title: 'Endereço', text: 'Londrina - PR' },
    { icon: Clock, title: 'Horário', text: 'Segunda a Domingo\n08:00 às 23:59' },
    { icon: Phone, title: 'Contato', text: 'WhatsApp: (43) 9 9999-9999' },
    { icon: Bike, title: 'Entrega', text: 'A partir de R$ 5,00\nTempo: 30-60 min' },
    { icon: Package, title: 'Pedido Mínimo', text: 'R$ 30,00' },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ maxWidth: '480px', left: 0, right: 0, margin: '0 auto' }}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-2xl p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">Informações da Loja</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          {items.map(item => (
            <div key={item.title} className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                <item.icon size={18} className="text-gray-700" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{item.title}</p>
                {item.text.split('\n').map((line, i) => <p key={i} className="text-gray-500 text-sm">{line}</p>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Promo Modal ─── */
function PromoModal({ promo, onClose }: { promo: Promotion | null; onClose: () => void }) {
  if (!promo) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ maxWidth: '480px', left: 0, right: 0, margin: '0 auto' }}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-2xl animate-slide-up overflow-hidden">
        {promo.image_url && (
          <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
            <Image src={promo.image_url} alt={promo.title} fill className="object-cover" />
            <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center"><X size={16} /></button>
          </div>
        )}
        <div className="p-6">
          {!promo.image_url && (
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 uppercase">{promo.title}</h2>
              <button onClick={onClose}><X size={20} /></button>
            </div>
          )}
          {promo.image_url && <h2 className="text-xl font-bold text-gray-900 uppercase mb-3">{promo.title}</h2>}
          <p className="text-gray-600 leading-relaxed">{promo.description}</p>
          <button onClick={onClose} className="w-full mt-6 bg-black text-white font-bold py-3 rounded-xl">Entendi!</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Category Dropdown ─── */
function CategoryDropdown({ isOpen, onClose, selectedId, categories, onSelect }: {
  isOpen: boolean; onClose: () => void; selectedId: string | null;
  categories: Category[]; onSelect: (id: string | null) => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50" style={{ maxWidth: '480px', left: 0, right: 0, margin: '0 auto' }}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full bg-white rounded-b-2xl max-h-[70vh] flex flex-col shadow-xl animate-slide-down">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-base font-bold">Categorias</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto">
          <button onClick={() => { onSelect(null); onClose(); }}
            className={`w-full flex items-center px-4 py-3 hover:bg-gray-50 ${!selectedId ? 'bg-gray-50' : ''}`}>
            <span className={`text-sm flex-1 text-left ${!selectedId ? 'font-bold text-black' : 'font-medium text-gray-700'}`}>Todas as categorias</span>
            {!selectedId && <Check size={16} className="text-black" />}
          </button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => { onSelect(cat.id); onClose(); }}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 ${selectedId === cat.id ? 'bg-gray-50' : ''}`}>
              {cat.image_url && (
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                  <Image src={cat.image_url} alt={cat.name} width={40} height={40} className="w-full h-full object-contain p-1" />
                </div>
              )}
              <span className={`text-sm flex-1 text-left uppercase ${selectedId === cat.id ? 'font-bold text-black' : 'font-medium text-gray-700'}`}>{cat.name}</span>
              {selectedId === cat.id && <Check size={16} className="text-black" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Sticky Header ─── */
function StickyHeader({ visible, categoryName, onCategoryClick, onSearchClick }: {
  visible: boolean; categoryName: string; onCategoryClick: () => void; onSearchClick: () => void;
}) {
  return (
    <div className={`fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-100 shadow-sm transition-transform duration-200 ${visible ? 'translate-y-0' : '-translate-y-full'}`}
      style={{ maxWidth: '480px', margin: '0 auto' }}>
      <div className="flex items-center gap-3 px-3 py-2">
        <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0">
          <Image src="/logo.png" alt="POD House" width={36} height={36} className="w-full h-full object-cover" />
        </div>
        <button onClick={onCategoryClick}
          className="flex-1 flex items-center gap-1.5 px-3 py-2 bg-gray-100 rounded-xl text-xs font-medium text-gray-800">
          <span className="flex-1 text-left truncate">{categoryName}</span>
          <ChevronDown size={14} className="text-gray-500 flex-shrink-0" />
        </button>
        <button onClick={onSearchClick} className="w-9 h-9 flex items-center justify-center bg-gray-100 rounded-xl">
          <Search size={18} className="text-gray-700" />
        </button>
      </div>
    </div>
  );
}

/* ─── Search Overlay ─── */
function SearchOverlay({ isOpen, onClose, value, onChange }: {
  isOpen: boolean; onClose: () => void; value: string; onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (isOpen) setTimeout(() => ref.current?.focus(), 80); else onChange(''); }, [isOpen]);
  if (!isOpen) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 shadow-md animate-slide-down"
      style={{ maxWidth: '480px', margin: '0 auto' }}>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input ref={ref} type="text" value={value} onChange={e => onChange(e.target.value)}
            placeholder="Busque por um produto"
            className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none" />
        </div>
        <button onClick={onClose} className="text-sm font-semibold text-gray-700">Cancelar</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════ */
export default function HomePage() {
  const supabase = createClient();
  const { user, profile, signOut } = useAuth();
  const { items: cartItems, totalItems: cartCount } = useCart();

  const [activeTab, setActiveTab] = useState<'inicio' | 'promocoes' | 'pedidos' | 'perfil'>('inicio');
  const [isCartOpen,     setIsCartOpen]     = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isDeliveryOpen, setIsDeliveryOpen] = useState(false);
  const [isStoreInfoOpen,setIsStoreInfoOpen]= useState(false);
  const [isAuthOpen,     setIsAuthOpen]     = useState(false);
  const [selectedPromo,  setSelectedPromo]  = useState<Promotion | null>(null);
  const [selectedProduct,setSelectedProduct]= useState<Product | null>(null);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [selectedCatId,  setSelectedCatId]  = useState<string | null>(null);
  const [isCatOpen,      setIsCatOpen]      = useState(false);
  const [isSearchOpen,   setIsSearchOpen]   = useState(false);
  const [showStickyHdr,  setShowStickyHdr]  = useState(false);

  // Data
  const [products,    setProducts]    = useState<Product[]>([]);
  const [categories,  setCategories]  = useState<Category[]>([]);
  const [promotions,  setPromotions]  = useState<Promotion[]>([]);
  const [orders,      setOrders]      = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    async function load() {
      const [prods, cats, promos] = await Promise.all([
        supabase.from('products').select('*, product_variants(*), categories(*)').eq('active', true).order('sort_order'),
        supabase.from('categories').select('*').eq('active', true).order('sort_order'),
        supabase.from('promotions').select('*').eq('active', true).order('sort_order'),
      ]);
      if (prods.data) setProducts(prods.data as Product[]);
      if (cats.data)  setCategories(cats.data as Category[]);
      if (promos.data) setPromotions(promos.data as Promotion[]);
      setLoadingData(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (user) {
      supabase.from('orders').select('*, order_items(*)').eq('user_id', user.id).order('created_at', { ascending: false })
        .then(({ data }) => { if (data) setOrders(data); });
    }
  }, [user]);

  useEffect(() => {
    const h = () => setShowStickyHdr(window.scrollY > 180);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  const featured   = products.filter(p => p.is_featured);
  const categoryName = selectedCatId ? categories.find(c => c.id === selectedCatId)?.name ?? 'Categorias' : 'Lista de categorias';

  const filtered = products.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchQ = !q || p.name.toLowerCase().includes(q);
    const matchC = !selectedCatId || p.category_id === selectedCatId;
    return matchQ && matchC;
  });

  /* ── INÍCIO ── */
  const renderInicio = () => (
    <div style={{ paddingBottom: '80px' }}>
      {/* Banner */}
      <div className="relative w-full">
        <div className="relative w-full" style={{ aspectRatio: '1280/466' }}>
          <Image src="/banner.png" alt="POD House" fill className="object-cover" priority />
        </div>
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
          <div className="w-20 h-20 rounded-full border-4 border-white overflow-hidden shadow-lg bg-white">
            <Image src="/logo.png" alt="POD House Logo" width={80} height={80} className="w-full h-full object-cover" />
          </div>
        </div>
      </div>

      {/* Store info */}
      <div className="bg-white mt-10 px-4 pt-4 pb-5 text-center border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900 mb-1">POD House</h1>
        <div className="flex items-center justify-center gap-1.5 text-gray-600 text-sm mb-1">
          <MapPin size={13} className="text-gray-500" />
          <span>Londrina - PR</span>
          <span className="text-gray-300 mx-1">•</span>
          <button onClick={() => setIsStoreInfoOpen(true)} className="font-bold text-gray-900 hover:underline">Mais informações</button>
        </div>
        <p className="text-green-600 font-semibold text-sm">Aberto até às 23h59</p>
      </div>

      {/* Delivery btn */}
      <div className="bg-white mt-2">
        <button onClick={() => setIsDeliveryOpen(true)}
          className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"><MapPin size={18} className="text-gray-700" /></div>
            <span className="font-semibold text-gray-800 text-sm">Calcular taxa e tempo de entrega</span>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </button>
      </div>

      {/* Loyalty */}
      <div className="bg-white mt-2 px-4 py-4 border-t border-b border-gray-100">
        <div className="flex items-center gap-3 mb-1.5">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"><Gift size={18} className="text-gray-700" /></div>
          <h3 className="font-bold text-gray-900 text-sm">Programa de fidelidade</h3>
        </div>
        <p className="text-gray-600 text-sm leading-relaxed">
          A cada <strong>R$ 1,00</strong> em compras você ganha <strong>1 ponto</strong> — 100 pts = R$ 5 de desconto.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white mt-2 px-4 py-3 flex items-center gap-2 border-b border-gray-100">
        <button onClick={() => setIsCatOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 flex-1">
          <span className="flex-1 text-left truncate">{categoryName}</span>
          <ChevronDown size={14} className="text-gray-500 flex-shrink-0" />
        </button>
        <button onClick={() => setIsSearchOpen(true)}
          className="w-10 h-10 border border-gray-200 rounded-xl flex items-center justify-center">
          <Search size={18} className="text-gray-700" />
        </button>
      </div>

      {/* Filter results */}
      {(searchQuery || selectedCatId) && (
        <div className="bg-white mt-2 px-4 pt-4 pb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold">{searchQuery ? `"${searchQuery}"` : categoryName}</h2>
            <button onClick={() => { setSearchQuery(''); setSelectedCatId(null); setIsSearchOpen(false); }}
              className="text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg px-3 py-1">Limpar</button>
          </div>
          {loadingData ? (
            <div className="grid grid-cols-2 gap-3">{[1,2,3,4].map(i => <div key={i} className="bg-gray-100 rounded-xl h-48 animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12"><Search size={40} className="text-gray-300 mx-auto mb-3" /><p className="text-gray-500">Nenhum produto encontrado</p></div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map(p => <ProductCard key={p.id} product={p} onTap={setSelectedProduct} />)}
            </div>
          )}
        </div>
      )}

      {/* Promotions */}
      {!searchQuery && !selectedCatId && promotions.length > 0 && (
        <div className="bg-white mt-2 px-4 pt-4 pb-5">
          <div className="grid grid-cols-2 gap-3">
            {promotions.map(promo => (
              <div key={promo.id} onClick={() => setSelectedPromo(promo)}
                className="cursor-pointer rounded-xl overflow-hidden shadow-sm active:opacity-75 border border-gray-100">
                {promo.image_url && (
                  <div className="relative" style={{ aspectRatio: '4/3' }}>
                    <Image src={promo.image_url} alt={promo.title} fill className="object-cover" />
                  </div>
                )}
                <div className="p-2.5 bg-white">
                  <h3 className="font-bold text-gray-900 text-xs uppercase">{promo.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Featured */}
      {!searchQuery && !selectedCatId && (
        <div className="bg-white mt-2 px-4 pt-4 pb-5">
          <h2 className="text-base font-bold text-gray-900 mb-3">Destaques</h2>
          {loadingData ? (
            <div className="grid grid-cols-2 gap-3">{[1,2,3,4].map(i => <div key={i} className="bg-gray-100 rounded-xl h-48 animate-pulse" />)}</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {(featured.length > 0 ? featured : products.slice(0, 6)).map(p =>
                <ProductCard key={p.id} product={p} onTap={setSelectedProduct} />
              )}
            </div>
          )}
        </div>
      )}

      {/* Categories grid */}
      {!searchQuery && !selectedCatId && (
        <div className="bg-white mt-2 px-4 pt-4 pb-5">
          <h2 className="text-base font-bold text-gray-900 mb-3">Categorias</h2>
          {loadingData ? (
            <div className="grid grid-cols-2 gap-3">{[1,2,3,4].map(i => <div key={i} className="bg-gray-100 rounded-xl h-48 animate-pulse" />)}</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {categories.map(cat => <CategoryTile key={cat.id} category={cat} onClick={() => setSelectedCatId(cat.id)} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );

  /* ── PROMOÇÕES ── */
  const renderPromocoes = () => (
    <div style={{ paddingBottom: '80px' }}>
      <div className="bg-white px-4 pt-6 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold mb-0.5">Promoções</h1>
        <p className="text-gray-500 text-sm">Aproveite nossas ofertas exclusivas</p>
      </div>
      <div className="mt-2 space-y-2">
        {promotions.map(promo => (
          <div key={promo.id} onClick={() => setSelectedPromo(promo)}
            className="bg-white cursor-pointer active:opacity-75">
            {promo.image_url && (
              <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
                <Image src={promo.image_url} alt={promo.title} fill className="object-cover" />
              </div>
            )}
            <div className="px-4 py-3">
              <h3 className="font-bold text-sm uppercase mb-1">{promo.title}</h3>
              <p className="text-gray-500 text-xs line-clamp-2">{promo.description}</p>
              <span className="text-xs font-semibold text-gray-700 flex items-center gap-1 mt-1">Ver detalhes <ChevronRight size={12} /></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ── PEDIDOS ── */
  const renderPedidos = () => (
    <div style={{ paddingBottom: '80px' }}>
      <div className="bg-white px-4 pt-6 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold mb-0.5">Meus Pedidos</h1>
      </div>
      {!user ? (
        <div className="bg-white mt-2 px-4 py-12 text-center">
          <ShoppingBag size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">Faça login para ver seus pedidos</p>
          <button onClick={() => setIsAuthOpen(true)} className="bg-black text-white font-bold px-8 py-3 rounded-xl">Entrar</button>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white mt-2 px-4 py-12 text-center">
          <ShoppingBag size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">Nenhum pedido ainda</p>
          <button onClick={() => setActiveTab('inicio')} className="bg-black text-white font-bold px-8 py-3 rounded-xl">Ver cardápio</button>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          {orders.map((order: any) => (
            <div key={order.id} className="bg-white px-4 py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString('pt-BR')}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                  order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>{order.status === 'pending' ? 'Pendente' : order.status === 'delivered' ? 'Entregue' : order.status === 'cancelled' ? 'Cancelado' : 'Em andamento'}</span>
              </div>
              {order.order_items?.map((item: any) => (
                <p key={item.id} className="text-sm text-gray-700">{item.quantity}× {item.product_name} — {item.variant_name}</p>
              ))}
              <p className="text-base font-bold text-gray-900 mt-2">{fmt(order.total)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  /* ── PERFIL ── */
  const renderPerfil = () => (
    <div style={{ paddingBottom: '80px' }}>
      <div className="bg-white px-4 pt-6 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold">Perfil</h1>
      </div>
      <div className="mt-2 space-y-2">
        {user ? (
          <>
            <div className="bg-white px-4 py-5 flex items-center gap-4">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                <User size={28} className="text-gray-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{profile?.full_name ?? 'Usuário'}</h3>
                <p className="text-gray-500 text-sm">{user.email}</p>
              </div>
            </div>

            {/* Pontos */}
            <div className="bg-white px-4 py-4">
              <div className="bg-gray-900 rounded-2xl p-5 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <Star size={20} className="text-yellow-400" />
                  <h3 className="font-bold">Programa de Fidelidade</h3>
                </div>
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold">{profile?.points_balance ?? 0}</p>
                  <p className="text-gray-300 text-sm">pontos acumulados</p>
                  <p className="text-yellow-300 text-xs mt-1">{Math.floor((profile?.points_balance ?? 0) / 100) * 5} reais disponíveis para desconto</p>
                </div>
              </div>
            </div>

            <div className="bg-white">
              {[
                { icon: ShoppingBag, label: 'Meus Pedidos', action: () => setActiveTab('pedidos') },
                { icon: Gift, label: 'Cupons Disponíveis', action: () => {} },
                { icon: MapPin, label: 'Meus Endereços', action: () => {} },
                { icon: Info, label: 'Sobre a Loja', action: () => setIsStoreInfoOpen(true) },
              ].map((item, i, arr) => (
                <button key={item.label} onClick={item.action}
                  className={`w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 ${i < arr.length-1 ? 'border-b border-gray-100' : ''}`}>
                  <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center"><item.icon size={18} className="text-gray-700" /></div>
                  <span className="font-medium text-gray-800 flex-1 text-left">{item.label}</span>
                  <ChevronRight size={16} className="text-gray-400" />
                </button>
              ))}
            </div>
            <div className="bg-white px-4 py-3">
              <button onClick={signOut} className="w-full flex items-center justify-center gap-2 py-3 text-red-500 font-semibold">
                <LogOut size={18} /> Sair da conta
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white px-4 py-5 flex items-center gap-4">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center"><User size={28} className="text-gray-500" /></div>
              <div><h3 className="font-bold">Visitante</h3><p className="text-gray-500 text-sm">Faça login para acessar</p></div>
            </div>
            <div className="bg-white px-4 py-3">
              <button onClick={() => setIsAuthOpen(true)} className="w-full bg-black text-white font-bold py-4 rounded-xl">Entrar / Cadastrar</button>
            </div>
            <div className="bg-white px-4 py-4">
              <div className="bg-gray-900 rounded-2xl p-5 text-white text-center">
                <Star size={24} className="text-yellow-400 mx-auto mb-2" />
                <p className="font-bold mb-1">Programa de Fidelidade</p>
                <p className="text-gray-300 text-sm">1 ponto por R$1 — 100 pts = R$5 de desconto</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen" style={{ maxWidth: '480px', margin: '0 auto' }}>
      <StickyHeader visible={showStickyHdr && activeTab === 'inicio'} categoryName={categoryName}
        onCategoryClick={() => setIsCatOpen(true)} onSearchClick={() => setIsSearchOpen(true)} />
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} value={searchQuery} onChange={setSearchQuery} />

      <main>
        {activeTab === 'inicio'    && renderInicio()}
        {activeTab === 'promocoes' && renderPromocoes()}
        {activeTab === 'pedidos'   && renderPedidos()}
        {activeTab === 'perfil'    && renderPerfil()}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 bg-white border-t border-gray-200 flex items-center z-40"
        style={{ maxWidth: '480px', left: 0, right: 0, margin: '0 auto', height: '64px' }}>
        {([
          { id: 'inicio', icon: Home, label: 'Início' },
          { id: 'promocoes', icon: Tag, label: 'Promoções' },
          { id: 'pedidos', icon: ShoppingBag, label: 'Pedidos' },
          { id: 'perfil', icon: User, label: 'Perfil' },
        ] as const).map(tab => {
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 ${active ? 'text-black' : 'text-gray-400'}`}>
              <tab.icon size={22} strokeWidth={active ? 2.5 : 1.5} />
              <span className={`text-[10px] ${active ? 'font-bold' : 'font-medium'}`}>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Cart FAB */}
      {cartCount > 0 && (
        <button onClick={() => setIsCartOpen(true)}
          className="fixed w-14 h-14 bg-black text-white rounded-full shadow-xl flex items-center justify-center z-30"
          style={{ bottom: '76px', right: '16px' }}>
          <ShoppingBag size={22} />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {cartCount}
          </span>
        </button>
      )}

      {/* Modals */}
      <ProductDetailSheet product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)}
        onCheckout={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }} />
      <CheckoutFlow isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} />
      <DeliveryModal isOpen={isDeliveryOpen} onClose={() => setIsDeliveryOpen(false)} />
      <StoreInfoModal isOpen={isStoreInfoOpen} onClose={() => setIsStoreInfoOpen(false)} />
      <PromoModal promo={selectedPromo} onClose={() => setSelectedPromo(null)} />
      <CategoryDropdown isOpen={isCatOpen} onClose={() => setIsCatOpen(false)}
        selectedId={selectedCatId} categories={categories} onSelect={setSelectedCatId} />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
}

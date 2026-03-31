'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  Info,
  Check,
  Package
} from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useAuth } from '@/hooks/use-auth';
import ProfileTab from '@/components/profile-tab';
import CheckoutFlow from '@/components/CheckoutFlow';
import OrdersTab from '@/components/orders-tab';

// Define types based on your Supabase schema
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
};

type Product = {
  id: string;
  name: string;
  base_price: number;
  puffs: string | null;
  is_featured: boolean;
  category_id: string | null;
  product_variants: ProductVariant[];
};

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: (product: Product, variant: ProductVariant) => void }) {
  const mainVariant = product.product_variants?.[0];
  if (!mainVariant) return null;

  const price = mainVariant.price_override ?? product.base_price;
  const image = mainVariant.image_url ?? '/logo.png'; // Fallback image

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="relative bg-gray-50" style={{aspectRatio: '1/1'}}>
        <Image
          src={image}
          alt={product.name}
          fill
          className="object-contain p-2"
          sizes="(max-width: 480px) 50vw, 200px"
        />
        {/* You can add logic for sale prices if needed */}
        {/* {product.originalPrice && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            OFERTA
          </div>
        )} */}
      </div>
      <div className="p-3">
        {product.puffs && <p className="text-xs text-gray-500 font-medium mb-1 line-clamp-1">{product.puffs}</p>}
        <h3 className="text-sm font-bold text-gray-900 line-clamp-2 mb-2 leading-tight">{product.name}</h3>
        <div className="flex items-center justify-between">
          <div>
            {/* {product.originalPrice && (
              <p className="text-xs text-gray-400 line-through">{formatCurrency(product.originalPrice)}</p>
            )} */}
            <p className="text-base font-bold text-purple-600">{formatCurrency(price)}</p>
          </div>
          <button
            onClick={() => onAdd(product, mainVariant)}
            className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center hover:bg-purple-700 transition-colors active:scale-95"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function CartModal({ 
  isOpen, onClose, items, onUpdateQuantity, onRemove, onCheckout 
}: {
  isOpen: boolean; onClose: () => void; items: any[]; // Using any because CartItem type is not exported from use-cart
  onUpdateQuantity: (variantId: string, qty: number) => void;
  onRemove: (variantId: string) => void; onCheckout: () => void;
}) {
  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{maxWidth:'480px',left:0,right:0,margin:'0 auto'}}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-2xl max-h-[85vh] flex flex-col animate-slide-up">
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
                <p className="text-purple-600 font-bold text-sm mt-1">{formatCurrency(item.unitPrice)}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => onUpdateQuantity(item.variantId, item.quantity - 1)} className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"><Minus size={12} /></button>
                <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                <button onClick={() => onUpdateQuantity(item.variantId, item.quantity + 1)} className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center hover:bg-purple-700"><Plus size={12} /></button>
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
            <button onClick={onCheckout} className="w-full bg-purple-600 text-white font-bold py-4 rounded-xl hover:bg-purple-700 transition-colors active:scale-95">
              Finalizar Pedido
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DeliveryModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [cep, setCep] = useState('');
  const [result, setResult] = useState<{fee: string; time: string} | null>(null);
  const handleCalculate = () => { if (cep.length >= 8) setResult({ fee: 'R$ 5,00', time: '30-45 min' }); };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{maxWidth:'480px',left:0,right:0,margin:'0 auto'}}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-2xl p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">Calcular Entrega</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Digite seu CEP</label>
            <input type="text" value={cep} onChange={(e) => setCep(e.target.value.replace(/\D/g,'').slice(0,8))} placeholder="00000-000" className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg font-medium focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100" />
          </div>
          <button onClick={handleCalculate} className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 transition-colors">Calcular</button>
          {result && (
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center"><Bike size={20} className="text-purple-600" /></div>
                <div><p className="text-sm text-gray-500">Taxa de entrega</p><p className="font-bold text-gray-900">{result.fee}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center"><Clock size={20} className="text-purple-600" /></div>
                <div><p className="text-sm text-gray-500">Tempo estimado</p><p className="font-bold text-gray-900">{result.time}</p></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StoreInfoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{maxWidth:'480px',left:0,right:0,margin:'0 auto'}}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-2xl p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">Informações da Loja</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          {[
            { icon: MapPin, title: 'Endereço', text: 'Londrina - PR' },
            { icon: Clock, title: 'Horário de Funcionamento', text: 'Segunda a Domingo\n08:00 às 23:59' },
            { icon: Phone, title: 'Contato', text: 'WhatsApp: (43) 9 9999-9999' },
            { icon: Bike, title: 'Entrega', text: 'Taxa a partir de R$ 5,00\nTempo estimado: 30-60 min' },
            { icon: Package, title: 'Pedido Mínimo', text: 'R$ 30,00' },
          ].map(item => (
            <div key={item.title} className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <item.icon size={20} className="text-purple-600" />
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

function PromoModal({ promo, onClose }: { promo: Promotion | null; onClose: () => void }) {
  if (!promo) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{maxWidth:'480px',left:0,right:0,margin:'0 auto'}}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-2xl animate-slide-up overflow-hidden">
        <div className="relative w-full" style={{aspectRatio:'16/9'}}>
          <Image src={promo.image_url || '/banner.png'} alt={promo.title} fill className="object-cover" />
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center"><X size={16} /></button>
        </div>
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">{promo.title}</h2>
          <p className="text-gray-600 leading-relaxed">{promo.description}</p>
          <button onClick={onClose} className="w-full mt-6 bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 transition-colors">Entendi!</button>
        </div>
      </div>
    </div>
  );
}

function CategoryDropdown({ isOpen, onClose, selectedCategory, onSelect, categories }: { 
  isOpen: boolean; onClose: () => void; selectedCategory: string | null; onSelect: (id: string | null) => void; categories: Category[];
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50" style={{maxWidth:'480px',left:0,right:0,margin:'0 auto'}}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full bg-white rounded-b-2xl max-h-[70vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Categorias</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto">
          <button onClick={() => { onSelect(null); onClose(); }} className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${!selectedCategory ? 'bg-purple-50' : ''}`}>
            <span className={`text-sm font-medium ${!selectedCategory ? 'text-purple-600' : 'text-gray-700'}`}>Todas as categorias</span>
            {!selectedCategory && <Check size={16} className="text-purple-600 ml-auto" />}
          </button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => { onSelect(cat.id); onClose(); }} className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${selectedCategory === cat.id ? 'bg-purple-50' : ''}`}>
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                <Image src={cat.image_url || '/logo.png'} alt={cat.name} width={40} height={40} className="w-full h-full object-contain p-1" />
              </div>
              <span className={`text-sm font-medium flex-1 text-left ${selectedCategory === cat.id ? 'text-purple-600' : 'text-gray-700'}`}>{cat.name}</span>
              {selectedCategory === cat.id && <Check size={16} className="text-purple-600" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

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

  // Data from Supabase
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const { supabase } = useAuth();
  const cart = useCart();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [promotionsRes, categoriesRes, productsRes] = await Promise.all([
        supabase.from('promotions').select('*').eq('active', true).order('sort_order'),
        supabase.from('categories').select('*').eq('active', true).order('sort_order'),
        supabase.from('products').select(`
          *,
          product_variants ( * )
        `).eq('active', true).eq('product_variants.active', true).order('sort_order')
      ]);

      if (promotionsRes.data) setPromotions(promotionsRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (productsRes.data) setAllProducts(productsRes.data as Product[]);
      
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
  
  function handleAddToCart(product: Product, variant: ProductVariant) {
    const price = variant.price_override ?? product.base_price;
    const image = variant.image_url ?? '/logo.png';

    cart.addItem({
      variantId: variant.id,
      productId: product.id,
      productName: product.name,
      variantName: variant.name,
      imageUrl: image,
      unitPrice: price,
    });
    setIsCartOpen(true);
  }
  
  const renderInicio = () => (
    <div style={{paddingBottom: '80px'}}>
      {/* Banner Header */}
      <div className="relative w-full">
        <div className="relative w-full" style={{aspectRatio:'1280/466'}}>
          <Image src="/banner.png" alt="POD House Banner" fill className="object-cover" priority />
        </div>
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
          <div className="w-20 h-20 rounded-full border-4 border-white overflow-hidden shadow-lg bg-white">
            <Image src="/logo.png" alt="POD House Logo" width={80} height={80} className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
      
      {/* Store Info */}
      <div className="mt-12 px-4 pb-4 text-center border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900 mb-1">POD House</h1>
        <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mb-1">
          <MapPin size={14} className="text-gray-400" />
          <span>Londrina - PR</span>
          <span className="text-gray-300">•</span>
          <button onClick={() => setIsStoreInfoOpen(true)} className="text-purple-600 font-medium hover:underline">Mais informações</button>
        </div>
        <p className="text-green-500 font-semibold text-sm flex items-center justify-center gap-1">
          <Clock size={13} />
          Aberto até às 23h59
        </p>
      </div>
      
      {/* Delivery Calculator */}
      <div className="mx-4 my-3">
        <button onClick={() => setIsDeliveryOpen(true)} className="w-full flex items-center justify-between px-4 py-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center"><Bike size={18} className="text-purple-600" /></div>
            <span className="font-semibold text-gray-800 text-sm">Calcular taxa e tempo de entrega</span>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </button>
      </div>
      
      {/* Loyalty Program */}
      <div className="mx-4 mb-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center"><Gift size={18} className="text-amber-500" /></div>
          <h3 className="font-bold text-gray-900 text-sm">Programa de fidelidade</h3>
        </div>
        <p className="text-gray-600 text-sm leading-relaxed">
          A cada <strong>R$ 1,00</strong> em compras você ganha <strong>1 ponto</strong> que pode ser trocado por prêmios.
        </p>
      </div>
      
      {/* Search and Category Filter */}
      <div className="px-4 mb-4 flex items-center gap-2">
        <button onClick={() => setIsCategoryDropdownOpen(true)} className="flex items-center gap-1.5 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm flex-shrink-0">
          <span className="max-w-[110px] truncate text-xs">{selectedCategoryName === 'Lista de categorias' ? 'Lista de categorias' : selectedCategoryName.split(' ').slice(0,3).join(' ')}</span>
          <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
        </button>
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Busque por um produto" className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 shadow-sm" />
        </div>
        <button className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
          <Search size={18} className="text-gray-600" />
        </button>
      </div>
      
      {/* Promotions Section */}
      {!searchQuery && !selectedCategory && (
        <div className="px-4 mb-6">
          <div className="grid grid-cols-2 gap-3">
            {promotions.map(promo => (
              <div key={promo.id} onClick={() => setSelectedPromo(promo)} className="cursor-pointer rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="relative" style={{aspectRatio:'4/3'}}>
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
      {!searchQuery && !selectedCategory && (
        <div className="px-4 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Destaques</h2>
          <div className="grid grid-cols-2 gap-3">
            {featuredProducts.map(product => (
              <ProductCard key={product.id} product={product} onAdd={handleAddToCart} />
            ))}
          </div>
        </div>
      )}
      
      {/* Categories Horizontal Scroll */}
      {!searchQuery && !selectedCategory && (
        <div className="mb-6">
          <div className="px-4 mb-3"><h2 className="text-lg font-bold text-gray-900">Categorias</h2></div>
          <div className="overflow-x-auto no-scrollbar">
            <div className="flex gap-2 px-4 pb-2" style={{width:'max-content'}}>
              {categories.slice(0, 12).map(cat => (
                <div key={cat.id} onClick={() => setSelectedCategory(cat.id)} className="flex flex-col items-center gap-2 cursor-pointer p-2 rounded-xl hover:bg-gray-50">
                  <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-gray-200">
                    <Image src={cat.image_url || '/logo.png'} alt={cat.name} width={64} height={64} className="w-full h-full object-contain bg-gray-50 p-1" />
                  </div>
                  <p className="text-xs text-center font-medium leading-tight text-gray-700 w-16 line-clamp-2">{cat.name.split(' ').slice(0,3).join(' ')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Search Results */}
      {(searchQuery || selectedCategory) && (
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">{searchQuery ? `"${searchQuery}"` : selectedCategoryName.split(' ').slice(0,4).join(' ')}</h2>
            <button onClick={() => { setSearchQuery(''); setSelectedCategory(null); }} className="text-purple-600 text-sm font-medium">Limpar</button>
          </div>
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Search size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Nenhum produto encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map(product => <ProductCard key={product.id} product={product} onAdd={handleAddToCart} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
  
  const renderPromocoes = () => (
    <div style={{paddingBottom:'80px'}}>
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Promoções</h1>
        <p className="text-gray-500 text-sm">Aproveite nossas ofertas exclusivas</p>
      </div>
      <div className="px-4 space-y-4">
        {promotions.map(promo => (
          <div key={promo.id} onClick={() => setSelectedPromo(promo)} className="cursor-pointer rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-shadow">
            <div className="relative w-full" style={{aspectRatio:'16/9'}}>
              <Image src={promo.image_url || '/banner.png'} alt={promo.title} fill className="object-cover" />
            </div>
            <div className="p-4 bg-white border border-gray-100 border-t-0 rounded-b-2xl">
              <h3 className="font-bold text-gray-900 text-base uppercase mb-1">{promo.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed line-clamp-3">{promo.description}</p>
              <button className="mt-3 text-purple-600 font-semibold text-sm flex items-center gap-1">Ver detalhes <ChevronRight size={14} /></button>
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 mt-8 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Produtos em Promoção</h2>
        <div className="grid grid-cols-2 gap-3">
          {allProducts.filter(p => p.is_featured).map(product => <ProductCard key={product.id} product={product} onAdd={handleAddToCart} />)}
        </div>
      </div>
    </div>
  );
  
  const renderPedidos = () => <OrdersTab setActiveTab={setActiveTab} />;
  
  return (
    <div className="relative min-h-screen bg-white" style={{maxWidth:'480px',margin:'0 auto'}}>
      <main>
        {activeTab === 'inicio' && renderInicio()}
        {activeTab === 'promocoes' && renderPromocoes()}
        {activeTab === 'pedidos' && renderPedidos()}
        {activeTab === 'perfil' && <ProfileTab />}
      </main>
      
      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 bg-white border-t border-gray-200 flex items-center z-40" style={{maxWidth:'480px',left:0,right:0,margin:'0 auto',height:'70px'}}>
        {[
          { id: 'inicio', icon: Home, label: 'Início' },
          { id: 'promocoes', icon: Tag, label: 'Promoções' },
          { id: 'pedidos', icon: ShoppingBag, label: 'Pedidos' },
          { id: 'perfil', icon: User, label: 'Perfil' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} className={`flex-1 flex flex-col items-center gap-1 py-2 transition-colors ${activeTab === tab.id ? 'text-purple-600' : 'text-gray-400'}`}>
            <tab.icon size={22} strokeWidth={activeTab === tab.id ? 2.5 : 1.5} />
            <span className="text-[10px] font-semibold">{tab.label}</span>
          </button>
        ))}
      </nav>
      
      {/* Cart FAB */}
      {cart.totalItems > 0 && (
        <button onClick={() => setIsCartOpen(true)} className="fixed w-14 h-14 bg-purple-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-purple-700 transition-colors z-30" style={{bottom:'90px',right:'16px'}}>
          <ShoppingBag size={24} />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">{cart.totalItems}</span>
        </button>
      )}
      
      {/* Modals */}
      <CartModal isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={cart.items} onUpdateQuantity={cart.updateQty} onRemove={cart.removeItem} onCheckout={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }} />
      <CheckoutFlow isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} />
      <DeliveryModal isOpen={isDeliveryOpen} onClose={() => setIsDeliveryOpen(false)} />
      <StoreInfoModal isOpen={isStoreInfoOpen} onClose={() => setIsStoreInfoOpen(false)} />
      <PromoModal promo={selectedPromo} onClose={() => setSelectedPromo(null)} />
      <CategoryDropdown isOpen={isCategoryDropdownOpen} onClose={() => setIsCategoryDropdownOpen(false)} selectedCategory={selectedCategory} onSelect={setSelectedCategory} categories={categories} />
    </div>
  );
}

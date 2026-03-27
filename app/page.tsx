'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { ShoppingBag, Search, Filter, Menu, User, MapPin, Info, Gift, LogIn, LogOut, Settings } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import Cart, { CartItem } from '@/components/Cart';
import Checkout from '@/components/Checkout';
import { useAuth } from '@/hooks/use-auth';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import Link from 'next/link';

export default function HomePage() {
  const { user, login, logout, isAdmin, userData } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [variations, setVariations] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Fetch Categories
    const qCat = query(collection(db, 'categories'), where('active', '==', true), orderBy('name'));
    const unsubscribeCat = onSnapshot(qCat, (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'categories'));

    // Fetch Products
    const qProd = query(collection(db, 'products'), where('active', '==', true), orderBy('createdAt', 'desc'));
    const unsubscribeProd = onSnapshot(qProd, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'products'));

    // Fetch Variations
    const qVar = query(collection(db, 'variations'), where('active', '==', true));
    const unsubscribeVar = onSnapshot(qVar, (snapshot) => {
      setVariations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'variations'));

    // Fetch Promotions
    const qPromo = query(collection(db, 'promotions'), where('active', '==', true));
    const unsubscribePromo = onSnapshot(qPromo, (snapshot) => {
      setPromotions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'promotions'));

    return () => {
      unsubscribeCat();
      unsubscribeProd();
      unsubscribeVar();
      unsubscribePromo();
    };
  }, []);

  const enrichedProducts = products.map(p => {
    const productVariations = variations.filter(v => v.productId === p.id);
    const productPromo = promotions.find(promo => promo.productIds?.includes(p.id));
    return {
      ...p,
      variations: productVariations,
      promo: productPromo
    };
  }).filter(p => p.variations.length > 0);

  const filteredProducts = enrichedProducts.filter(p => {
    const matchesCategory = activeCategory === 'all' || p.categoryId === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddToCart = (product: any, variation: any) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.variationId === variation.id);
      if (existing) {
        return prev.map(item => 
          item.variationId === variation.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      
      const price = product.promo 
        ? (product.promo.discountType === 'PERCENTUAL' 
            ? variation.salePrice * (1 - product.promo.discountValue / 100) 
            : Math.max(0, variation.salePrice - product.promo.discountValue))
        : variation.salePrice;

      return [...prev, {
        productId: product.id,
        variationId: variation.id,
        name: product.name,
        variationName: variation.variationName,
        price,
        quantity: 1,
        imageUrl: variation.imageUrl
      }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (variationId: string, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.variationId === variationId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeItem = (variationId: string) => {
    setCartItems(prev => prev.filter(item => item.variationId !== variationId));
  };

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-xl border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex flex-col">
              <h1 className="font-display text-2xl uppercase tracking-tighter text-primary leading-none">Pod House</h1>
              <div className="flex items-center gap-1 text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">
                <MapPin size={10} className="text-secondary" />
                Londrina - PR
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link href="/admin" className="p-3 bg-surface rounded-2xl border border-border hover:bg-surface-hover transition-colors hidden md:flex" title="Admin Panel">
                <Settings size={20} className="text-primary" />
              </Link>
            )}
            
            {user ? (
              <div className="relative group">
                <button className="flex items-center gap-3 p-2 pr-4 bg-surface rounded-full border border-border hover:bg-surface-hover transition-all">
                  <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-primary/30">
                    {user.photoURL ? (
                      <Image src={user.photoURL} alt={user.displayName || ''} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full bg-surface-hover flex items-center justify-center">
                        <User size={16} className="text-gray-500" />
                      </div>
                    )}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 leading-none mb-1">Saldo</p>
                    <p className="text-xs font-black text-primary leading-none">R$ {userData?.cashbackBalance?.toFixed(2) || '0.00'}</p>
                  </div>
                </button>
                <div className="absolute right-0 top-full mt-2 w-56 bg-surface rounded-[32px] shadow-2xl border border-border p-4 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="p-4 bg-background/50 rounded-2xl border border-border mb-4">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Cashback Disponível</p>
                    <p className="text-2xl font-black text-primary">R$ {userData?.cashbackBalance?.toFixed(2) || '0.00'}</p>
                  </div>
                  <button 
                    onClick={logout}
                    className="w-full flex items-center gap-3 p-4 text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 rounded-2xl transition-colors"
                  >
                    <LogOut size={16} />
                    Sair da Conta
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={login}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-black rounded-full font-black text-[10px] uppercase tracking-widest hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] transition-all active:scale-95"
              >
                <LogIn size={16} />
                Entrar
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        {/* User Stats (Logged In) */}
        {user && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 gap-4"
          >
            <div className="bg-surface p-6 rounded-[32px] border border-border flex flex-col justify-between h-32 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all"></div>
              <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                <Gift size={12} className="text-primary" />
                Saldo Cashback
              </div>
              <div className="text-3xl font-display text-primary tracking-tighter">
                R$ {userData?.cashbackBalance?.toFixed(2) || '0.00'}
              </div>
            </div>
            <div className="bg-surface p-6 rounded-[32px] border border-border flex flex-col justify-between h-32 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary/5 rounded-full blur-2xl group-hover:bg-secondary/10 transition-all"></div>
              <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                <ShoppingBag size={12} className="text-secondary" />
                Meus Pedidos
              </div>
              <div className="text-3xl font-display text-white tracking-tighter">
                03 <span className="text-xs font-black text-gray-600 ml-1">Ativos</span>
              </div>
            </div>
          </motion.section>
        )}

        {/* Banner */}
        <section className="relative h-56 md:h-[450px] rounded-[40px] overflow-hidden group shadow-2xl">
          <Image
            src="https://picsum.photos/seed/podhouse/1920/1080"
            alt="Promoção do Dia"
            fill
            className="object-cover transition-transform duration-1000 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex flex-col justify-end p-8 md:p-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4 max-w-xl"
            >
              <div className="inline-flex items-center gap-2 bg-secondary/20 backdrop-blur-md border border-secondary/30 text-secondary px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                <Gift size={12} />
                Oferta Especial
              </div>
              <h2 className="font-display text-4xl md:text-7xl text-white uppercase leading-none tracking-tighter">
                Quinta do <span className="text-primary drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]">Pod</span>
              </h2>
              <p className="text-gray-300 text-xs md:text-xl font-medium leading-relaxed max-w-md">
                Toda quinta-feira, leve 2 Pods Ignite V15 e ganhe 15% de desconto no segundo produto!
              </p>
              <button className="btn-primary px-8 py-4 rounded-full text-xs font-black uppercase tracking-widest mt-4">
                Aproveitar Agora
              </button>
            </motion.div>
          </div>
        </section>

        {/* Search & Filter */}
        <section className="sticky top-20 z-30 bg-background/80 backdrop-blur-xl py-6 -mx-4 px-4 space-y-6">
          <div className="relative max-w-3xl mx-auto">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" size={20} />
            <input 
              type="text" 
              placeholder="O que você procura hoje?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-6 py-5 bg-surface rounded-[24px] border border-border focus:border-primary outline-none transition-all text-sm font-bold placeholder:text-gray-700 shadow-inner"
            />
          </div>
          <div className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar max-w-5xl mx-auto">
            <button 
              onClick={() => setActiveCategory('all')}
              className={`flex-shrink-0 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeCategory === 'all' 
                  ? 'bg-primary text-black shadow-[0_0_20px_rgba(255,215,0,0.3)] scale-105' 
                  : 'bg-surface text-gray-500 hover:text-white border border-border'
              }`}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex-shrink-0 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeCategory === cat.id 
                    ? 'bg-primary text-black shadow-[0_0_20px_rgba(255,215,0,0.3)] scale-105' 
                    : 'bg-surface text-gray-500 hover:text-white border border-border'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </section>

        {/* Product Grid */}
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-2xl uppercase tracking-tighter text-white">Cardápio</h3>
            <div className="h-px flex-grow mx-6 bg-border hidden sm:block"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">{filteredProducts.length} Produtos</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-10">
            {filteredProducts.map(product => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
          {filteredProducts.length === 0 && (
            <div className="text-center py-24 border-2 border-dashed border-border rounded-[40px]">
              <p className="text-gray-600 font-black uppercase tracking-widest">Nenhum produto encontrado.</p>
            </div>
          )}
        </section>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 inset-x-0 bg-surface/90 backdrop-blur-xl border-t border-border h-20 flex items-center justify-around md:hidden z-40 px-4">
        <button className="flex flex-col items-center gap-1.5 text-primary">
          <ShoppingBag size={22} />
          <span className="text-[9px] font-black uppercase tracking-widest">Cardápio</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-gray-500">
          <Gift size={22} />
          <span className="text-[9px] font-black uppercase tracking-widest">Promo</span>
        </button>
        
        {/* Floating Cart Trigger */}
        <button 
          onClick={() => setIsCartOpen(true)}
          className="relative -mt-12 w-16 h-16 bg-primary text-black rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,215,0,0.4)] border-4 border-background transition-transform active:scale-90"
        >
          <ShoppingBag size={28} />
          {cartItems.length > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-secondary text-black text-[10px] font-black flex items-center justify-center rounded-full border-2 border-background">
              {cartItems.reduce((sum, i) => sum + i.quantity, 0)}
            </span>
          )}
        </button>

        <button className="flex flex-col items-center gap-1.5 text-gray-500">
          <User size={22} />
          <span className="text-[9px] font-black uppercase tracking-widest">Perfil</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-gray-500">
          <Info size={22} />
          <span className="text-[9px] font-black uppercase tracking-widest">Info</span>
        </button>
      </nav>

      {/* Modals */}
      <Cart 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        items={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemove={removeItem}
        onCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      <Checkout 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)} 
        items={cartItems}
        total={total}
      />
    </div>
  );
}

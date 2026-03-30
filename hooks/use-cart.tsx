'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { CartItem } from '@/lib/supabase/types';
import { useAuth } from './use-auth';

const STORAGE_KEY = 'podhouse_cart';

interface CartContextType {
  items: CartItem[];
  addItem:       (item: Omit<CartItem, 'quantity'>, qty?: number) => Promise<void>;
  removeItem:    (variantId: string) => Promise<void>;
  updateQty:     (variantId: string, qty: number) => Promise<void>;
  clearCart:     () => Promise<void>;
  totalItems:    number;
  totalPrice:    number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function readLocalCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function writeLocalCart(items: CartItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { user }  = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);

  // Carrega carrinho (Supabase se logado, localStorage se visitante)
  useEffect(() => {
    if (!user) {
      setItems(readLocalCart());
      return;
    }
    // Usuário logado: busca carrinho do Supabase
    supabase
      .from('cart_items')
      .select(`
        quantity,
        variant_id,
        product_variants!inner (
          id, name, image_url, price_override,
          products!inner ( id, name, base_price )
        )
      `)
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (!data) return;
        const remote: CartItem[] = data.map((row: any) => {
          const v = row.product_variants;
          const p = v.products;
          return {
            variantId:   v.id,
            productId:   p.id,
            productName: p.name,
            variantName: v.name,
            imageUrl:    v.image_url ?? '',
            unitPrice:   v.price_override ?? p.base_price,
            quantity:    row.quantity,
          };
        });

        // Merge com carrinho local (convidado → logado)
        const local = readLocalCart();
        if (local.length > 0) {
          const merged = mergeCarts(remote, local);
          syncRemoteCart(user.id, merged).then(() => {
            setItems(merged);
            localStorage.removeItem(STORAGE_KEY);
          });
        } else {
          setItems(remote);
        }
      });
  }, [user]);

  function mergeCarts(remote: CartItem[], local: CartItem[]): CartItem[] {
    const map = new Map<string, CartItem>(remote.map(i => [i.variantId, { ...i }]));
    for (const l of local) {
      if (map.has(l.variantId)) {
        map.get(l.variantId)!.quantity += l.quantity;
      } else {
        map.set(l.variantId, { ...l });
      }
    }
    return Array.from(map.values());
  }

  async function syncRemoteCart(userId: string, cart: CartItem[]) {
    await supabase.from('cart_items').delete().eq('user_id', userId);
    if (cart.length === 0) return;
    await supabase.from('cart_items').insert(
      cart.map(i => ({ user_id: userId, variant_id: i.variantId, quantity: i.quantity }))
    );
  }

  const persist = useCallback((next: CartItem[]) => {
    setItems(next);
    if (!user) writeLocalCart(next);
  }, [user]);

  async function addItem(item: Omit<CartItem, 'quantity'>, qty = 1) {
    setItems(prev => {
      const existing = prev.find(i => i.variantId === item.variantId);
      const next = existing
        ? prev.map(i => i.variantId === item.variantId ? { ...i, quantity: i.quantity + qty } : i)
        : [...prev, { ...item, quantity: qty }];
      if (!user) writeLocalCart(next);
      if (user) {
        supabase.from('cart_items')
          .upsert({ user_id: user.id, variant_id: item.variantId, quantity: existing ? existing.quantity + qty : qty },
                  { onConflict: 'user_id,variant_id' })
          .then();
      }
      return next;
    });
  }

  async function removeItem(variantId: string) {
    setItems(prev => {
      const next = prev.filter(i => i.variantId !== variantId);
      if (!user) writeLocalCart(next);
      if (user) supabase.from('cart_items').delete().match({ user_id: user.id, variant_id: variantId }).then();
      return next;
    });
  }

  async function updateQty(variantId: string, qty: number) {
    if (qty <= 0) return removeItem(variantId);
    setItems(prev => {
      const next = prev.map(i => i.variantId === variantId ? { ...i, quantity: qty } : i);
      if (!user) writeLocalCart(next);
      if (user) supabase.from('cart_items').upsert({ user_id: user.id, variant_id: variantId, quantity: qty },
        { onConflict: 'user_id,variant_id' }).then();
      return next;
    });
  }

  async function clearCart() {
    setItems([]);
    if (!user) localStorage.removeItem(STORAGE_KEY);
    if (user) await supabase.from('cart_items').delete().eq('user_id', user.id);
  }

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

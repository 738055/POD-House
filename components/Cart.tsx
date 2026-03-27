'use client';

import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Minus, ShoppingBag, Trash2, Gift } from 'lucide-react';
import Image from 'next/image';

export interface CartItem {
  productId: string;
  variationId: string;
  name: string;
  variationName: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (variationId: string, delta: number) => void;
  onRemove: (variationId: string) => void;
  onCheckout: () => void;
}

export default function Cart({ isOpen, onClose, items, onUpdateQuantity, onRemove, onCheckout }: CartProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cashback = subtotal * 0.05; // 5% cashback example

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-surface z-50 shadow-2xl flex flex-col border-l border-border"
          >
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="text-primary" />
                <h2 className="font-display text-2xl uppercase tracking-tight text-white">Seu Carrinho</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-full transition-colors text-gray-400">
                <X size={24} />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-6 space-y-6">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-600 space-y-4">
                  <ShoppingBag size={64} strokeWidth={1} />
                  <p className="text-lg font-bold uppercase tracking-widest">Seu carrinho está vazio</p>
                  <button onClick={onClose} className="btn-primary">Continuar Comprando</button>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.variationId} className="flex gap-4 items-center">
                    <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-surface-hover border border-border">
                      <Image
                        src={item.imageUrl || 'https://picsum.photos/seed/pod/200/200'}
                        alt={item.name}
                        fill
                        className="object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-grow">
                      <h4 className="font-bold text-sm line-clamp-1 text-white uppercase tracking-tight">{item.name}</h4>
                      <p className="text-[10px] text-gray-500 mb-2 uppercase font-black tracking-widest">{item.variationName}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 bg-surface-hover rounded-xl p-1 border border-border">
                          <button 
                            onClick={() => onUpdateQuantity(item.variationId, -1)}
                            className="p-1.5 hover:bg-surface rounded-lg transition-colors text-primary"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="text-sm font-black w-4 text-center text-white">{item.quantity}</span>
                          <button 
                            onClick={() => onUpdateQuantity(item.variationId, 1)}
                            className="p-1.5 hover:bg-surface rounded-lg transition-colors text-primary"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <span className="font-black text-sm text-primary">R$ {(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => onRemove(item.variationId)}
                      className="p-2 text-gray-600 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="p-6 bg-surface-hover border-t border-border space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="text-white">R$ {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                    <span className="text-gray-500">Descontos</span>
                    <span className="text-secondary">- R$ 0.00</span>
                  </div>
                  <div className="flex justify-between text-xl font-black border-t border-border pt-3 mt-2 uppercase tracking-tighter">
                    <span className="text-white">Total</span>
                    <span className="text-primary">R$ {subtotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-black flex-shrink-0">
                    <Gift size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">Cashback Garantido!</p>
                    <p className="text-[10px] text-primary/80 font-bold">Você ganhará R$ {cashback.toFixed(2)} nesta compra.</p>
                  </div>
                </div>

                <button 
                  onClick={onCheckout}
                  className="w-full btn-primary text-center py-4 text-lg uppercase tracking-widest font-display shadow-xl"
                >
                  Finalizar Pedido
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

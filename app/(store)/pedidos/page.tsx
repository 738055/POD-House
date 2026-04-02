'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { createClient } from '@/lib/supabase/client';
import type { Order, OrderItem } from '@/lib/supabase/types';
import { ArrowLeft, ShoppingBag, ChevronDown, ChevronUp, Loader2, Clock, CheckCircle, XCircle, Truck, Package, ChefHat } from 'lucide-react';

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const STATUS_CONFIG: Record<Order['status'], { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  pending:           { label: 'Aguardando',     color: 'text-yellow-700', bg: 'bg-yellow-50',  Icon: Clock },
  confirmed:         { label: 'Confirmado',      color: 'text-blue-700',   bg: 'bg-blue-50',    Icon: CheckCircle },
  preparing:         { label: 'Preparando',      color: 'text-orange-700', bg: 'bg-orange-50',  Icon: ChefHat },
  out_for_delivery:  { label: 'Saiu p/ entrega', color: 'text-purple-700', bg: 'bg-purple-50',  Icon: Truck },
  delivered:         { label: 'Entregue',        color: 'text-green-700',  bg: 'bg-green-50',   Icon: Package },
  cancelled:         { label: 'Cancelado',       color: 'text-red-700',    bg: 'bg-red-50',     Icon: XCircle },
};

type OrderWithItems = Order & { order_items: OrderItem[] };

export default function PedidosPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) loadOrders();
  }, [user]);

  async function loadOrders() {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    setOrders((data as OrderWithItems[]) ?? []);
    setLoading(false);
  }

  function toggle(id: string) {
    setExpanded(prev => (prev === id ? null : id));
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white px-4 py-4 flex items-center gap-3 border-b border-gray-200 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 flex-1">Meus Pedidos</h1>
      </div>

      <div className="px-4 py-4 space-y-3">
        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <ShoppingBag size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nenhum pedido ainda</p>
            <p className="text-gray-400 text-sm mt-1">Seus pedidos aparecerão aqui após a compra.</p>
            <button onClick={() => router.push('/')} className="mt-4 bg-purple-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-purple-700 transition-colors text-sm">
              Ver cardápio
            </button>
          </div>
        ) : (
          orders.map(order => {
            const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
            const isOpen = expanded === order.id;
            return (
              <div key={order.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                {/* Header row */}
                <button onClick={() => toggle(order.id)} className="w-full px-4 py-4 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                    <cfg.Icon size={18} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900">Pedido #{order.id.slice(-6).toUpperCase()}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900">{fmt(order.total)}</p>
                    {isOpen ? <ChevronUp size={16} className="text-gray-400 ml-auto mt-1" /> : <ChevronDown size={16} className="text-gray-400 ml-auto mt-1" />}
                  </div>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                    {/* Items */}
                    <div className="space-y-2">
                      {order.order_items.map(item => (
                        <div key={item.id} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 bg-gray-100 rounded-full text-xs font-bold text-gray-600 flex items-center justify-center flex-shrink-0">{item.quantity}</span>
                            <div className="min-w-0">
                              <p className="text-sm text-gray-800 truncate">{item.product_name}</p>
                              {item.variant_name && <p className="text-xs text-gray-400">{item.variant_name}</p>}
                            </div>
                          </div>
                          <p className="text-sm font-medium text-gray-700 flex-shrink-0">{fmt(item.subtotal)}</p>
                        </div>
                      ))}
                    </div>

                    {/* Totals */}
                    <div className="border-t border-dashed border-gray-200 pt-3 space-y-1 text-sm">
                      <div className="flex justify-between text-gray-500">
                        <span>Subtotal</span>
                        <span>{fmt(order.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <span>Frete</span>
                        <span>{order.delivery_fee === 0 ? 'Grátis' : fmt(order.delivery_fee)}</span>
                      </div>
                      {order.coupon_discount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Cupom {order.coupon_code && `(${order.coupon_code})`}</span>
                          <span>-{fmt(order.coupon_discount)}</span>
                        </div>
                      )}
                      {order.points_discount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Pontos resgatados</span>
                          <span>-{fmt(order.points_discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-100">
                        <span>Total</span>
                        <span>{fmt(order.total)}</span>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-xs text-gray-500">
                      <p className="font-semibold text-gray-700 mb-0.5">Endereço de entrega</p>
                      <p>{order.address_logradouro}, {order.address_number}{order.address_complement ? `, ${order.address_complement}` : ''}</p>
                      <p>{order.address_neighborhood} — {order.address_city}-{order.address_uf}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Order } from '@/lib/supabase/types';
import { ChevronDown, RefreshCw } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente', confirmed: 'Confirmado', preparing: 'Preparando',
  out_for_delivery: 'Saiu p/ entrega', delivered: 'Entregue', cancelled: 'Cancelado',
};
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  confirmed: 'bg-blue-500/20 text-blue-400',
  preparing: 'bg-orange-500/20 text-orange-400',
  out_for_delivery: 'bg-purple-500/20 text-purple-400',
  delivered: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-red-500/20 text-red-400',
};

function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

export default function OrdersPage() {
  const supabase = createClient();
  const [orders, setOrders]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('');
  const [expanded, setExpanded]   = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const query = supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).limit(100);
    if (filter) query.eq('status', filter);
    const { data } = await query;
    if (data) setOrders(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filter]);

  async function updateStatus(id: string, status: string) {
    await supabase.from('orders').update({ status }).eq('id', id);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Pedidos</h1>
          <p className="text-gray-400 text-sm mt-1">{orders.length} pedidos</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none">
            <option value="">Todos os status</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button onClick={load} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400 py-12 text-center">Carregando...</div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <div key={order.id} className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-gray-800/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-bold text-sm">{order.customer_name ?? 'Cliente'}</span>
                    <span className="text-gray-500 text-xs">{new Date(order.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                  <p className="text-gray-400 text-xs truncate">{order.address_neighborhood} — {fmt(order.total)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={order.status}
                    onClick={e => e.stopPropagation()}
                    onChange={e => updateStatus(order.id, e.target.value)}
                    className={`text-xs font-semibold px-2 py-1 rounded-full border-0 focus:outline-none cursor-pointer ${STATUS_COLORS[order.status]}`}
                    style={{ background: 'transparent' }}
                  >
                    {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v} className="bg-gray-900 text-white">{l}</option>)}
                  </select>
                  <ChevronDown size={16} className={`text-gray-500 transition-transform ${expanded === order.id ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {expanded === order.id && (
                <div className="px-6 pb-5 border-t border-gray-800 pt-4">
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Cliente</p>
                      <p className="text-white">{order.customer_name}</p>
                      <p className="text-gray-400">{order.customer_phone}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Endereço</p>
                      <p className="text-white">{order.address_logradouro}, {order.address_number}</p>
                      <p className="text-gray-400">{order.address_neighborhood} — {order.address_cep}</p>
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-xl p-4 space-y-2 mb-4">
                    {order.order_items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-gray-300">{item.quantity}× {item.product_name} <span className="text-gray-500">({item.variant_name})</span></span>
                        <span className="text-white font-semibold">{fmt(item.unit_price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-gray-400"><span>Subtotal</span><span>{fmt(order.subtotal)}</span></div>
                    <div className="flex justify-between text-gray-400"><span>Entrega</span><span>{fmt(order.delivery_fee)}</span></div>
                    {order.coupon_discount > 0 && <div className="flex justify-between text-green-400"><span>Cupom ({order.coupon_code})</span><span>-{fmt(order.coupon_discount)}</span></div>}
                    {order.points_discount > 0 && <div className="flex justify-between text-green-400"><span>Pontos</span><span>-{fmt(order.points_discount)}</span></div>}
                    <div className="flex justify-between font-bold text-white text-base pt-2 border-t border-gray-700"><span>Total</span><span>{fmt(order.total)}</span></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

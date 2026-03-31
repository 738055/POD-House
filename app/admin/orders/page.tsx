'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Order } from '@/lib/supabase/types';
import { ChevronDown, RefreshCw, MessageCircle, CheckCircle, Star, Loader2, AlertCircle } from 'lucide-react';

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
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmResult, setConfirmResult] = useState<{ orderId: string; points: number } | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

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

  // Confirmar pedido (gera pontos de fidelidade)
  async function confirmOrder(orderId: string) {
    setConfirmingId(orderId);
    setConfirmError(null);
    setConfirmResult(null);

    const { data, error } = await (supabase.rpc as any)('confirm_order', { p_order_id: orderId });

    if (error) {
      setConfirmError(error.message);
      setConfirmingId(null);
      return;
    }

    const result = data as { success: boolean; order_id: string; points_earned: number; user_id: string | null };
    setConfirmResult({ orderId: result.order_id, points: result.points_earned });
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'confirmed' } : o));
    setConfirmingId(null);

    // Auto-dismiss after 4s
    setTimeout(() => setConfirmResult(null), 4000);
  }

  const pendingCount = orders.filter(o => o.status === 'pending').length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Pedidos</h1>
          <p className="text-gray-400 text-sm mt-1">
            {orders.length} pedidos
            {pendingCount > 0 && (
              <span className="ml-2 bg-yellow-500/20 text-yellow-400 text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
              </span>
            )}
          </p>
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

      {/* Confirm success toast */}
      {confirmResult && (
        <div className="mb-4 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 flex items-center gap-3 animate-fade-in">
          <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
          <div>
            <p className="text-green-400 font-semibold text-sm">Pedido #{confirmResult.orderId.slice(0, 8)} confirmado!</p>
            {confirmResult.points > 0 && (
              <p className="text-green-400/70 text-xs flex items-center gap-1">
                <Star size={12} /> {confirmResult.points} pontos de fidelidade gerados para o cliente
              </p>
            )}
          </div>
        </div>
      )}

      {confirmError && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-2">
          <AlertCircle size={18} className="text-red-400" />
          <p className="text-red-400 text-sm">{confirmError}</p>
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 py-12 text-center">Carregando...</div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <div key={order.id} className={`bg-gray-900 rounded-2xl border overflow-hidden ${
              order.status === 'pending' ? 'border-yellow-500/40' : 'border-gray-800'
            }`}>
              <button
                onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-gray-800/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-bold text-sm">{order.customer_name ?? 'Cliente'}</span>
                    <span className="text-gray-500 text-xs">{new Date(order.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                    {order.status === 'pending' && (
                      <span className="bg-yellow-500/20 text-yellow-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">NOVO</span>
                    )}
                  </div>
                  <p className="text-gray-400 text-xs truncate">{order.address_neighborhood} — {fmt(order.total)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status]}`}>
                    {STATUS_LABELS[order.status]}
                  </span>
                  <ChevronDown size={16} className={`text-gray-500 transition-transform ${expanded === order.id ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {expanded === order.id && (
                <div className="px-6 pb-5 border-t border-gray-800 pt-4">
                  {/* Confirm Button - Destacado para pedidos pendentes */}
                  {order.status === 'pending' && (
                    <div className="mb-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <AlertCircle size={18} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-yellow-400 font-semibold text-sm">Pedido aguardando confirmação</p>
                          <p className="text-yellow-400/70 text-xs mt-0.5">
                            Ao confirmar, o cliente receberá <strong>{Math.floor(order.total)} pontos</strong> de fidelidade.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => confirmOrder(order.id)}
                        disabled={confirmingId === order.id}
                        className="w-full bg-green-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50"
                      >
                        {confirmingId === order.id ? (
                          <><Loader2 size={18} className="animate-spin" /> Confirmando...</>
                        ) : (
                          <><CheckCircle size={18} /> Confirmar Compra & Gerar Pontos</>
                        )}
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 text-sm">
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
                        <span className="text-gray-300">{item.quantity}x {item.product_name} <span className="text-gray-500">({item.variant_name})</span></span>
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

                  {/* Actions row */}
                  <div className="flex gap-3 mt-4">
                    {/* WhatsApp */}
                    {order.customer_phone && (
                      <button
                        onClick={() => {
                          const items = order.order_items?.map((i: any) => `${i.quantity}x ${i.product_name} (${i.variant_name})`).join('\n') || '';
                          const msg = encodeURIComponent(
                            `Olá ${order.customer_name || 'Cliente'}! 🎉\n\nSeu pedido #${order.id.slice(0, 8)} foi ${order.status === 'confirmed' ? 'confirmado' : 'recebido'}!\n\n📋 *Itens:*\n${items}\n\n💰 *Total:* ${fmt(order.total)}\n🏍️ *Entrega:* ${order.address_neighborhood}\n\nPOD House 💜`
                          );
                          const phone = order.customer_phone.replace(/\D/g, '');
                          window.open(`https://wa.me/55${phone}?text=${msg}`, '_blank');
                          supabase.from('orders').update({ whatsapp_sent: true }).eq('id', order.id);
                          setOrders(prev => prev.map(o => o.id === order.id ? { ...o, whatsapp_sent: true } : o));
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold ${
                          order.whatsapp_sent
                            ? 'bg-gray-800 text-gray-400'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        <MessageCircle size={16} />
                        {order.whatsapp_sent ? 'WhatsApp enviado' : 'Enviar via WhatsApp'}
                      </button>
                    )}

                    {/* Status change for non-pending orders */}
                    {order.status !== 'pending' && (
                      <select
                        value={order.status}
                        onChange={e => updateStatus(order.id, e.target.value)}
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
                      >
                        {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {orders.length === 0 && (
            <div className="text-gray-500 text-center py-12">Nenhum pedido encontrado.</div>
          )}
        </div>
      )}
    </div>
  );
}

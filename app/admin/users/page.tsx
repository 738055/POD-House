'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Search, Eye, X, ShoppingBag, Star, Phone, Loader2 } from 'lucide-react';

type UserRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: 'client' | 'admin';
  points_balance: number;
  created_at: string;
};

type OrderRow = {
  id: string;
  total: number;
  status: string;
  created_at: string;
  order_items: { product_name: string; variant_name: string; quantity: number; unit_price: number }[];
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente', confirmed: 'Confirmado', preparing: 'Preparando',
  out_for_delivery: 'Saiu p/ entrega', delivered: 'Entregue', cancelled: 'Cancelado',
};
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400', confirmed: 'bg-blue-500/20 text-blue-400',
  preparing: 'bg-orange-500/20 text-orange-400', out_for_delivery: 'bg-purple-500/20 text-purple-400',
  delivered: 'bg-green-500/20 text-green-400', cancelled: 'bg-red-500/20 text-red-400',
};

function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

const PAGE_SIZE = 25;

export default function UsersPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'' | 'client' | 'admin'>('');
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [userOrders, setUserOrders] = useState<OrderRow[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  async function loadUsers(p = 0) {
    setLoading(true);
    const from = p * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase.from('profiles').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
    if (roleFilter) query = query.eq('role', roleFilter);
    const { data, count } = await query;
    if (data) setUsers(data as UserRow[]);
    setTotalCount(count ?? 0);
    setLoading(false);
  }

  useEffect(() => { loadUsers(page); }, [roleFilter, page]);

  const filtered = users.filter(u => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (u.full_name?.toLowerCase().includes(s)) || (u.phone?.includes(s));
  });

  async function openUserDetail(user: UserRow) {
    setSelectedUser(user);
    setLoadingOrders(true);
    const { data } = await supabase.from('orders').select('*, order_items(*)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
    if (data) setUserOrders(data as OrderRow[]);
    setLoadingOrders(false);
  }

  const totalSpent = userOrders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0);
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Clientes</h1>
          <p className="text-gray-400 text-sm mt-1">{totalCount} usuários cadastrados</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            className="w-full pl-9 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-gray-500" />
        </div>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value as typeof roleFilter); setPage(0); }}
          className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none">
          <option value="">Todos</option>
          <option value="client">Clientes</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {loading ? (
        <div className="text-gray-400 py-12 text-center">Carregando...</div>
      ) : (
        <>
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-800">
                <tr className="text-gray-400 text-xs uppercase tracking-wide">
                  <th className="text-left px-6 py-4">Cliente</th>
                  <th className="text-left px-4 py-4">Telefone</th>
                  <th className="text-left px-4 py-4">Pontos</th>
                  <th className="text-left px-4 py-4">Tipo</th>
                  <th className="text-left px-4 py-4">Cadastro</th>
                  <th className="px-4 py-4" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((user, i) => (
                  <tr key={user.id} className={`border-b border-gray-800/50 ${i % 2 === 0 ? '' : 'bg-gray-800/20'}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-bold text-sm">
                          {(user.full_name || '?')[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium text-white">{user.full_name || 'Sem nome'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-300">{user.phone || '—'}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 text-amber-400">
                        <Star size={12} /><span className="font-semibold">{user.points_balance}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-700 text-gray-400'}`}>
                        {user.role === 'admin' ? 'Admin' : 'Cliente'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-400 text-xs">{new Date(user.created_at).toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-4">
                      <button onClick={() => openUserDetail(user)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="text-gray-500 text-center py-12">Nenhum cliente encontrado.</div>}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">Página {page + 1} de {totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
                  className="px-4 py-2 text-sm font-semibold text-gray-300 bg-gray-800 rounded-xl disabled:opacity-40 hover:bg-gray-700">← Anterior</button>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}
                  className="px-4 py-2 text-sm font-semibold text-gray-300 bg-gray-800 rounded-xl disabled:opacity-40 hover:bg-gray-700">Próxima →</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal de detalhe */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelectedUser(null)} />
          <div className="relative bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-white">Detalhes do Cliente</h2>
              <button onClick={() => setSelectedUser(null)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-bold text-2xl">
                  {(selectedUser.full_name || '?')[0]?.toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedUser.full_name || 'Sem nome'}</h3>
                  <div className="flex items-center gap-4 mt-1">
                    {selectedUser.phone && <span className="flex items-center gap-1 text-gray-400 text-sm"><Phone size={12} /> {selectedUser.phone}</span>}
                    <span className="flex items-center gap-1 text-amber-400 text-sm"><Star size={12} /> {selectedUser.points_balance} pontos</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-white">{userOrders.length}</p>
                  <p className="text-gray-400 text-xs mt-1">Pedidos</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 text-center">
                  <p className="text-xl font-bold text-green-400">{fmt(totalSpent)}</p>
                  <p className="text-gray-400 text-xs mt-1">Total Gasto</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-amber-400">{selectedUser.points_balance}</p>
                  <p className="text-gray-400 text-xs mt-1">Pontos</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <ShoppingBag size={14} /> Histórico de Compras
                </h4>
                {loadingOrders ? (
                  <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-400" size={24} /></div>
                ) : userOrders.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">Nenhum pedido encontrado.</div>
                ) : (
                  <div className="space-y-3">
                    {userOrders.map(order => (
                      <div key={order.id} className="bg-gray-800 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-semibold text-sm">#{order.id.slice(0, 8)}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold text-sm">{fmt(order.total)}</span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-700 text-gray-400'}`}>
                              {STATUS_LABELS[order.status] || order.status}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {order.order_items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs text-gray-400">
                              <span>{item.quantity}x {item.product_name} ({item.variant_name})</span>
                              <span>{fmt(item.unit_price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

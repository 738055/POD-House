'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { ShoppingBag, User, Loader2 } from 'lucide-react';

type Order = {
  id: string;
  created_at: string;
  total: number;
  status: string;
};

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const getStatusChip = (status: string) => {
  const styles: { [key: string]: string } = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    preparing: 'bg-indigo-100 text-indigo-800',
    out_for_delivery: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  const text: { [key: string]: string } = {
    pending: 'Pendente',
    confirmed: 'Confirmado',
    preparing: 'Preparando',
    out_for_delivery: 'Saiu para entrega',
    delivered: 'Entregue',
    cancelled: 'Cancelado',
  };
  return <span className={`px-2 py-1 text-xs font-bold rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>{text[status] || status}</span>;
};

export default function OrdersTab({ setActiveTab }: { setActiveTab: (tab: 'inicio' | 'promocoes' | 'pedidos' | 'perfil') => void }) {
  const { user, supabase, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetchOrders() {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('id, created_at, total, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) setOrders(data);
      setLoading(false);
    }

    fetchOrders();
  }, [user, supabase, authLoading]);

  if (loading || authLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-gray-400" size={32} /></div>;
  }

  const renderContent = () => {
    if (!user) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center mb-4"><User size={40} className="text-purple-300" /></div>
          <h3 className="text-lg font-bold text-gray-700 mb-2">Faça login para ver seus pedidos</h3>
          <p className="text-gray-400 text-sm mb-6">Acesse sua conta para ver seu histórico.</p>
          <button onClick={() => router.push('/login')} className="bg-purple-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-purple-700 transition-colors">Fazer Login</button>
        </div>
      );
    }

    if (orders.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center mb-4"><ShoppingBag size={40} className="text-purple-300" /></div>
          <h3 className="text-lg font-bold text-gray-700 mb-2">Nenhum pedido ainda</h3>
          <p className="text-gray-400 text-sm mb-6">Faça seu primeiro pedido e acompanhe aqui</p>
          <button onClick={() => setActiveTab('inicio')} className="bg-purple-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-purple-700 transition-colors">Ver cardápio</button>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {orders.map(order => (
          <div key={order.id} className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-xs text-gray-500">Pedido #{order.id.substring(0, 8)}</p>
                <p className="font-bold text-lg text-gray-900">{formatCurrency(order.total)}</p>
              </div>
              {getStatusChip(order.status)}
            </div>
            <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ paddingBottom: '80px' }}>
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Meus Pedidos</h1>
        <p className="text-gray-500 text-sm">Acompanhe seu histórico</p>
      </div>
      <div className="px-4">{renderContent()}</div>
    </div>
  );
}
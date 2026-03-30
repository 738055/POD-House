'use client';

import { useAuth } from '@/hooks/use-auth';
import { useState, useEffect } from 'react';
import { ShoppingBag, Users, TrendingUp, Package } from 'lucide-react';

// Tipagem para os dados do dashboard
type DashboardStats = {
  orders_count: number;
  clients_count: number;
  total_revenue: number;
  products_count: number;
};

// Componente para um card de estatística
function StatCard({ icon: Icon, title, value, isLoading }: { icon: React.ElementType, title: string, value: string | number, isLoading: boolean }) {
  return (
    <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 flex items-center gap-5">
      <div className="bg-gray-800 p-3 rounded-lg">
        <Icon className="text-gray-400" size={24} />
      </div>
      <div>
        <p className="text-sm text-gray-400">{title}</p>
        {isLoading ? (
          <div className="h-7 w-24 bg-gray-700 rounded-md animate-pulse mt-1"></div>
        ) : (
          <p className="text-2xl font-bold text-white">{value}</p>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { supabase } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      if (!supabase) return;

      setLoading(true);
      setError(null);

      // Chamada à função RPC do Supabase
      const { data, error } = await supabase.rpc('get_dashboard_stats');

      if (error) {
        console.error('Erro ao buscar estatísticas:', error);
        setError('Não foi possível carregar os dados do dashboard.');
      } else if (data && data.length > 0) {
        // A RPC retorna um array com um objeto, pegamos o primeiro.
        setStats(data[0]);
      }
      setLoading(false);
    }

    fetchStats();
  }, [supabase]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const statCards = [
    { icon: ShoppingBag, title: 'Total de Pedidos', value: stats?.orders_count ?? 0 },
    { icon: Users, title: 'Total de Clientes', value: stats?.clients_count ?? 0 },
    { icon: TrendingUp, title: 'Faturamento Total', value: formatCurrency(stats?.total_revenue ?? 0) },
    { icon: Package, title: 'Produtos Cadastrados', value: stats?.products_count ?? 0 },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
      <p className="text-gray-400 mb-8">Visão geral da sua loja.</p>

      {error && <div className="bg-red-500/10 text-red-400 p-4 rounded-lg mb-6">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <StatCard
            key={card.title}
            icon={card.icon}
            title={card.title}
            value={card.value}
            isLoading={loading}
          />
        ))}
      </div>
    </div>
  );
}
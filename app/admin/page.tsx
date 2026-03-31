'use client';

import { useAuth } from '@/hooks/use-auth';
import { useState, useEffect } from 'react';
import { StatCard } from './components/StatCard';
import { STAT_CARDS } from './lib/constants';

type DashboardStats = {
  orders_count: number;
  clients_count: number;
  total_revenue: number;
  products_count: number;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

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

      const { data, error } = await supabase.rpc('get_dashboard_stats');

      if (error) {
        console.error('Erro ao buscar estatísticas:', error);
        setError('Não foi possível carregar os dados do dashboard.');
      } else if (data && data.length > 0) {
        setStats(data[0]);
      }
      setLoading(false);
    }

    fetchStats();
  }, [supabase]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
      <p className="text-gray-400 mb-8">Visão geral da sua loja.</p>

      {error && <div className="bg-red-500/10 text-red-400 p-4 rounded-lg mb-6">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {STAT_CARDS.map((card) => (
          <StatCard
            key={card.title}
            icon={card.icon}
            title={card.title}
            value={
              card.dataKey === 'total_revenue'
                ? formatCurrency(stats?.[card.dataKey as keyof DashboardStats] ?? 0)
                : stats?.[card.dataKey as keyof DashboardStats] ?? 0
            }
            isLoading={loading}
          />
        ))}
      </div>
    </div>
  );
}
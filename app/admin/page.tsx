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

      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase.rpc('get_dashboard_stats');

        if (error) {
          console.error('Erro ao buscar estatísticas:', error);
          setError('Não foi possível carregar os dados do dashboard.');
        } else if (data) {
          // Ajustado para não quebrar caso a função RPC retorne um Objeto em vez de um Array
          setStats(Array.isArray(data) ? data[0] : data);
        }
      } catch (err) {
        console.error('Erro de requisição:', err);
        setError('Ocorreu um erro inesperado ao carregar os dados.');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [supabase]);

  return (
    <div className="w-full space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-black text-white tracking-tight">Dashboard</h1>
        <p className="text-gray-400 font-medium">Visão geral do desempenho da sua loja.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="font-bold text-sm">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 w-full">
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
'use client';

import { useAuth } from '@/hooks/use-auth';
import { useState, useEffect } from 'react';
import { StatCard } from './components/StatCard';
import { STAT_CARDS } from './lib/constants';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { TrendingUp, ShoppingBag } from 'lucide-react';

type DashboardStats = {
  orders_count: number;
  clients_count: number;
  total_revenue: number;
  products_count: number;
};

type DayData = {
  day: string;
  pedidos: number;
  receita: number;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 shadow-2xl">
      <p className="text-xs font-bold text-gray-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-sm font-bold" style={{ color: p.color }}>
          {p.dataKey === 'receita' ? formatCurrency(p.value) : `${p.value} pedidos`}
        </p>
      ))}
    </div>
  );
};

export default function AdminDashboard() {
  const { supabase } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      if (!supabase) return;
      setLoading(true);

      const [statsRes, ordersRes] = await Promise.all([
        supabase.rpc('get_dashboard_stats'),
        supabase
          .from('orders')
          .select('created_at, total, status')
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .neq('status', 'cancelled'),
      ]);

      if (statsRes.data) {
        setStats(Array.isArray(statsRes.data) ? statsRes.data[0] : statsRes.data);
      }

      if (ordersRes.data) {
        // Gera os últimos 7 dias como base
        const days: DayData[] = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return {
            day: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            pedidos: 0,
            receita: 0,
          };
        });

        ordersRes.data.forEach(order => {
          const label = new Date(order.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          const slot = days.find(d => d.day === label);
          if (slot) { slot.pedidos++; slot.receita += order.total; }
        });

        setChartData(days);
      }

      setLoading(false);
    }

    fetchAll();
  }, [supabase]);

  return (
    <div className="w-full space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-black text-white tracking-tight">Dashboard</h1>
        <p className="text-gray-400 font-medium">Visão geral do desempenho da sua loja.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 w-full">
        {STAT_CARDS.map(card => (
          <StatCard
            key={card.title}
            icon={card.icon}
            title={card.title}
            value={
              card.dataKey === 'total_revenue'
                ? formatCurrency(stats?.[card.dataKey as keyof DashboardStats] as number ?? 0)
                : stats?.[card.dataKey as keyof DashboardStats] ?? 0
            }
            isLoading={loading}
          />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Pedidos por dia */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <ShoppingBag size={18} className="text-purple-400" />
            <h2 className="font-black text-white">Pedidos — últimos 7 dias</h2>
          </div>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-purple-600/20 border-t-purple-600 rounded-full animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139,92,246,0.08)' }} />
                <Bar dataKey="pedidos" fill="#7c3aed" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Receita por dia */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={18} className="text-green-400" />
            <h2 className="font-black text-white">Receita — últimos 7 dias</h2>
          </div>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-green-600/20 border-t-green-600 rounded-full animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `R$${v}`} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(34,197,94,0.2)', strokeWidth: 2 }} />
                <Line type="monotone" dataKey="receita" stroke="#22c55e" strokeWidth={2.5}
                  dot={{ fill: '#22c55e', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

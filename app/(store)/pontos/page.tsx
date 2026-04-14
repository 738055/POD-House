'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { createClient } from '@/lib/supabase/client';
import type { PointsSettings, PointsTransaction } from '@/lib/supabase/types';
import {
  ArrowLeft, Star, Loader2, TrendingUp, Gift, Clock,
  Plus, Minus, ShoppingBag
} from 'lucide-react';

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const TYPE_CONFIG: Record<PointsTransaction['type'], { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  earn:       { label: 'Ganho',    color: 'text-green-600',  bg: 'bg-green-100',  Icon: Plus },
  redeem:     { label: 'Resgate',  color: 'text-amber-600',  bg: 'bg-amber-100',  Icon: Gift },
  expire:     { label: 'Expirado', color: 'text-red-600',    bg: 'bg-red-100',    Icon: Clock },
  adjustment: { label: 'Ajuste',   color: 'text-purple-600', bg: 'bg-purple-100', Icon: Star },
};

export default function PontosPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [settings, setSettings] = useState<PointsSettings | null>(null);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('points_settings').select('*').eq('id', 'default').single(),
      supabase.from('points_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ]).then(([settingsRes, txRes]) => {
      if (settingsRes.data) setSettings(settingsRes.data as PointsSettings);
      setTransactions((txRes.data as PointsTransaction[]) ?? []);
      setLoading(false);
    });
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-purple-600" />
      </div>
    );
  }

  const balance = profile?.points_balance ?? 0;
  const redeemRate = settings?.redeem_rate ?? 0.05;
  const earnRate = settings?.earn_rate ?? 1;
  const minRedeem = settings?.min_points_to_redeem ?? 100;
  const maxPct = settings?.max_redeem_percent ?? 0.20;
  const enabled = settings?.enabled ?? true;
  const balanceValue = balance * redeemRate;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center gap-3 border-b border-gray-200 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 flex-1">Meus Pontos</h1>
        <Star size={20} className="text-purple-600" />
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* Hero — saldo */}
        <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-2 mb-4">
            <Star size={22} className="text-yellow-300" />
            <span className="font-bold text-lg">Programa de Fidelidade</span>
            {!enabled && (
              <span className="ml-auto text-xs bg-white/20 px-2 py-0.5 rounded-full">Pausado</span>
            )}
          </div>
          <div className="bg-white/15 rounded-2xl p-5 text-center">
            <p className="text-purple-200 text-sm mb-1">Seu saldo atual</p>
            <p className="text-5xl font-black">{balance}</p>
            <p className="text-purple-200 text-sm mt-1">pontos</p>
            {balance > 0 && (
              <p className="mt-3 text-yellow-300 font-semibold text-sm">
                Vale até {fmt(balanceValue)} de desconto
              </p>
            )}
          </div>
        </div>

        {/* Como ganhar */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={18} className="text-green-500" />
            <h2 className="font-bold text-gray-900">Como Ganhar Pontos</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-green-50 rounded-xl p-3">
              <ShoppingBag size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Faça pedidos na loja</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  A cada <strong>R$ 1,00</strong> gasto você ganha{' '}
                  <strong className="text-green-600">{earnRate} {earnRate === 1 ? 'ponto' : 'pontos'}</strong>
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-400 px-1">
              Os pontos são creditados automaticamente quando o vendedor confirmar seu pedido.
            </p>
          </div>
        </div>

        {/* Como resgatar */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Gift size={18} className="text-amber-500" />
            <h2 className="font-bold text-gray-900">Como Resgatar</h2>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-amber-700">{minRedeem}</p>
                <p className="text-xs text-amber-600 mt-0.5">pontos mínimos</p>
                <p className="text-xs font-semibold text-amber-700 mt-1">= {fmt(minRedeem * redeemRate)}</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-purple-700">{Math.round(maxPct * 100)}%</p>
                <p className="text-xs text-purple-600 mt-0.5">máx. do pedido</p>
                <p className="text-xs font-semibold text-purple-700 mt-1">pode ser pontos</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-600">
                <strong>1 ponto = {fmt(redeemRate)}</strong> de desconto.
                Use seus pontos na etapa de pagamento ao finalizar o pedido.
              </p>
              {settings?.expiration_days && settings.expiration_days > 0 ? (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <Clock size={11} /> Pontos expiram em {settings.expiration_days} dias após a compra.
                </p>
              ) : (
                <p className="text-xs text-green-600 mt-1">Pontos não expiram.</p>
              )}
            </div>
          </div>
        </div>

        {/* Histórico */}
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Clock size={18} className="text-gray-400" />
            <h2 className="font-bold text-gray-900">Histórico</h2>
          </div>

          {transactions.length === 0 ? (
            <div className="p-8 text-center">
              <Star size={32} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium text-sm">Nenhuma movimentação ainda</p>
              <p className="text-gray-400 text-xs mt-1">Faça seu primeiro pedido e ganhe pontos!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {transactions.map(tx => {
                const cfg = TYPE_CONFIG[tx.type] ?? TYPE_CONFIG.adjustment;
                return (
                  <div key={tx.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                      <cfg.Icon size={16} className={cfg.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{tx.description ?? cfg.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(tx.created_at)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-black ${tx.points >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {tx.points >= 0 ? '+' : ''}{tx.points} pts
                      </p>
                      {tx.points !== 0 && (
                        <p className="text-xs text-gray-400">{fmt(Math.abs(tx.points) * redeemRate)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={() => router.push('/')}
          className="w-full bg-purple-600 text-white font-bold py-4 rounded-2xl hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
        >
          <ShoppingBag size={18} /> Ir para o cardápio
        </button>
      </div>
    </div>
  );
}

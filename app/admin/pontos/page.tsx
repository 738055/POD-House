'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Star, Save, Loader2, Users, ArrowUpCircle, ArrowDownCircle, Settings2, Search, X, Plus, Minus } from 'lucide-react';
import type { PointsSettings, PointsTransaction, Profile } from '@/lib/supabase/types';

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

type TransactionWithProfile = PointsTransaction & {
  profiles?: { full_name: string | null } | null;
};

type AdjustModal = {
  user: Profile;
  points: number;
  description: string;
};

const TYPE_CONFIG: Record<PointsTransaction['type'], { label: string; color: string; bg: string }> = {
  earn:       { label: 'Ganho',    color: 'text-green-400',  bg: 'bg-green-500/20' },
  redeem:     { label: 'Resgate',  color: 'text-amber-400',  bg: 'bg-amber-500/20' },
  expire:     { label: 'Expirado', color: 'text-red-400',    bg: 'bg-red-500/20'   },
  adjustment: { label: 'Ajuste',   color: 'text-purple-400', bg: 'bg-purple-500/20' },
};

export default function PontosAdminPage() {
  const supabase = createClient();

  // Settings
  const [settings, setSettings] = useState<PointsSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Users
  const [users, setUsers] = useState<Profile[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const PAGE_SIZE = 10;

  // Transactions
  const [transactions, setTransactions] = useState<TransactionWithProfile[]>([]);
  const [txLoading, setTxLoading] = useState(true);

  // Adjust modal
  const [modal, setModal] = useState<AdjustModal | null>(null);
  const [adjusting, setAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  // Load settings
  useEffect(() => {
    supabase.from('points_settings').select('*').eq('id', 'default').single()
      .then(({ data }) => { if (data) setSettings(data as PointsSettings); });
  }, []);

  // Load users
  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('points_balance', { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (search.trim()) {
      query = query.ilike('full_name', `%${search.trim()}%`);
    }

    const { data, count } = await query;
    setUsers((data as Profile[]) ?? []);
    setTotalUsers(count ?? 0);
    setUsersLoading(false);
  }, [page, search]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // Load transactions
  useEffect(() => {
    setTxLoading(true);
    supabase
      .from('points_transactions')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setTransactions((data as TransactionWithProfile[]) ?? []);
        setTxLoading(false);
      });
  }, []);

  async function saveSettings() {
    if (!settings) return;
    setSavingSettings(true);
    await supabase.from('points_settings').upsert({ ...settings, updated_at: new Date().toISOString() });
    setSavingSettings(false);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  }

  async function applyAdjust() {
    if (!modal) return;
    setAdjusting(true);
    setAdjustError(null);
    const { error } = await (supabase.rpc as any)('adjust_user_points', {
      p_user_id: modal.user.id,
      p_points: modal.points,
      p_description: modal.description || 'Ajuste manual',
    });
    if (error) {
      setAdjustError(error.message);
      setAdjusting(false);
      return;
    }
    setAdjusting(false);
    setModal(null);
    loadUsers();
    // Reload transactions
    supabase
      .from('points_transactions')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setTransactions((data as TransactionWithProfile[]) ?? []));
  }

  function updateSetting<K extends keyof PointsSettings>(key: K, value: PointsSettings[K]) {
    setSettings(prev => prev ? { ...prev, [key]: value } : prev);
  }

  const totalPages = Math.ceil(totalUsers / PAGE_SIZE);

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
          <Star size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-white font-black text-2xl tracking-tight">Pontos de Fidelidade</h1>
          <p className="text-gray-400 text-sm">Configure regras, gerencie saldos e veja o histórico</p>
        </div>
      </div>

      {/* ── Configurações ───────────────────────────────────── */}
      <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
        <div className="flex items-center gap-2 mb-5">
          <Settings2 size={18} className="text-purple-400" />
          <h2 className="text-white font-bold text-lg">Configurações do Programa</h2>
        </div>

        {!settings ? (
          <div className="flex items-center gap-2 text-gray-400"><Loader2 size={16} className="animate-spin" /> Carregando...</div>
        ) : (
          <div className="space-y-5">
            {/* Toggle habilitado */}
            <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-xl">
              <div>
                <p className="text-white font-semibold">Programa habilitado</p>
                <p className="text-gray-400 text-sm mt-0.5">Desativar impede acúmulo e resgate de pontos</p>
              </div>
              <button
                onClick={() => updateSetting('enabled', !settings.enabled)}
                className={`w-12 h-6 rounded-full transition-colors ${settings.enabled ? 'bg-purple-600' : 'bg-gray-600'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${settings.enabled ? 'translate-x-6' : ''}`} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Earn rate */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">
                  Pontos por R$ 1,00 gasto
                </label>
                <input
                  type="number" step="0.1" min="0"
                  value={settings.earn_rate}
                  onChange={e => updateSetting('earn_rate', parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500"
                />
                <p className="text-gray-500 text-xs mt-1">Ex: 1.0 = 1 ponto por real; 2.0 = 2 pontos por real</p>
              </div>

              {/* Redeem rate */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">
                  Valor R$ por ponto (resgate)
                </label>
                <input
                  type="number" step="0.01" min="0"
                  value={settings.redeem_rate}
                  onChange={e => updateSetting('redeem_rate', parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500"
                />
                <p className="text-gray-500 text-xs mt-1">
                  Ex: 0.05 → 100 pts = {fmt(100 * settings.redeem_rate)} de desconto
                </p>
              </div>

              {/* Min redeem */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">
                  Mínimo de pontos para resgatar
                </label>
                <input
                  type="number" step="10" min="1"
                  value={settings.min_points_to_redeem}
                  onChange={e => updateSetting('min_points_to_redeem', parseInt(e.target.value) || 1)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500"
                />
                <p className="text-gray-500 text-xs mt-1">
                  Vale {fmt(settings.min_points_to_redeem * settings.redeem_rate)} de desconto
                </p>
              </div>

              {/* Max redeem percent */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">
                  Máx. % do pedido pago com pontos
                </label>
                <input
                  type="number" step="5" min="1" max="100"
                  value={Math.round(settings.max_redeem_percent * 100)}
                  onChange={e => updateSetting('max_redeem_percent', (parseInt(e.target.value) || 1) / 100)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500"
                />
                <p className="text-gray-500 text-xs mt-1">
                  {Math.round(settings.max_redeem_percent * 100)}% do total pode ser coberto com pontos
                </p>
              </div>

              {/* Expiration */}
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">
                  Expiração dos pontos (dias, 0 = sem expiração)
                </label>
                <input
                  type="number" step="30" min="0"
                  value={settings.expiration_days}
                  onChange={e => updateSetting('expiration_days', parseInt(e.target.value) || 0)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <button
              onClick={saveSettings}
              disabled={savingSettings}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {savingSettings ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {settingsSaved ? 'Salvo!' : 'Salvar Configurações'}
            </button>
          </div>
        )}
      </div>

      {/* ── Usuários ────────────────────────────────────────── */}
      <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
        <div className="flex items-center gap-2 mb-5">
          <Users size={18} className="text-purple-400" />
          <h2 className="text-white font-bold text-lg">Saldos dos Usuários</h2>
          <span className="ml-auto text-gray-500 text-sm">{totalUsers} usuários</span>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Buscar por nome..."
            className="w-full bg-gray-700 border border-gray-600 text-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-purple-500"
          />
        </div>

        {usersLoading ? (
          <div className="flex items-center gap-2 text-gray-400 py-4"><Loader2 size={16} className="animate-spin" /> Carregando...</div>
        ) : (
          <>
            <div className="space-y-2">
              {users.map(u => (
                <div key={u.id} className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-xl hover:bg-gray-700 transition-colors">
                  <div className="w-8 h-8 bg-purple-600/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-400 text-xs font-bold">{(u.full_name ?? 'U')[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{u.full_name ?? 'Sem nome'}</p>
                    <p className="text-gray-400 text-xs">{u.phone ?? '—'}</p>
                  </div>
                  <div className="text-right mr-2">
                    <p className="text-purple-300 font-black">{u.points_balance} pts</p>
                    {settings && (
                      <p className="text-gray-500 text-xs">{fmt(u.points_balance * settings.redeem_rate)}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setModal({ user: u, points: 0, description: '' })}
                    className="p-2 bg-gray-600 hover:bg-purple-600 text-gray-300 hover:text-white rounded-lg transition-colors text-xs font-bold"
                    title="Ajustar pontos"
                  >
                    <Star size={14} />
                  </button>
                </div>
              ))}
              {users.length === 0 && <p className="text-gray-500 text-sm py-4 text-center">Nenhum usuário encontrado.</p>}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  className="text-sm text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
                  ← Anterior
                </button>
                <span className="text-gray-500 text-sm">Página {page + 1} de {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                  className="text-sm text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
                  Próxima →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Transações recentes ──────────────────────────────── */}
      <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
        <div className="flex items-center gap-2 mb-5">
          <ArrowUpCircle size={18} className="text-purple-400" />
          <h2 className="text-white font-bold text-lg">Transações Recentes</h2>
          <span className="ml-auto text-gray-500 text-sm">últimas 50</span>
        </div>

        {txLoading ? (
          <div className="flex items-center gap-2 text-gray-400 py-4"><Loader2 size={16} className="animate-spin" /> Carregando...</div>
        ) : (
          <div className="space-y-2">
            {transactions.map(tx => {
              const cfg = TYPE_CONFIG[tx.type] ?? TYPE_CONFIG.adjustment;
              return (
                <div key={tx.id} className="flex items-center gap-3 p-3 bg-gray-700/40 rounded-xl">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                    {tx.points >= 0
                      ? <Plus size={12} className={cfg.color} />
                      : <Minus size={12} className={cfg.color} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">
                      {tx.profiles?.full_name ?? 'Usuário desconhecido'}
                    </p>
                    <p className="text-gray-400 text-xs truncate">{tx.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`text-sm font-black ${tx.points >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.points >= 0 ? '+' : ''}{tx.points} pts
                    </span>
                    <p className="text-gray-500 text-xs">{formatDate(tx.created_at)}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>
              );
            })}
            {transactions.length === 0 && <p className="text-gray-500 text-sm py-4 text-center">Nenhuma transação ainda.</p>}
          </div>
        )}
      </div>

      {/* ── Modal ajuste ─────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setModal(null)} />
          <div className="relative bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">Ajustar Pontos</h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="bg-gray-700/50 rounded-xl p-3 mb-4">
              <p className="text-white font-semibold">{modal.user.full_name ?? 'Sem nome'}</p>
              <p className="text-gray-400 text-sm">Saldo atual: <strong className="text-purple-300">{modal.user.points_balance} pts</strong></p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">
                  Pontos (positivo = crédito, negativo = débito)
                </label>
                <input
                  type="number"
                  value={modal.points}
                  onChange={e => setModal(m => m ? { ...m, points: parseInt(e.target.value) || 0 } : m)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500"
                  placeholder="Ex: 100 ou -50"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">
                  Descrição
                </label>
                <input
                  type="text"
                  value={modal.description}
                  onChange={e => setModal(m => m ? { ...m, description: e.target.value } : m)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500"
                  placeholder="Ex: Bônus de aniversário"
                />
              </div>
            </div>

            {adjustError && (
              <div className="mt-3 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl px-4 py-2 text-sm">
                {adjustError}
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl transition-colors">
                Cancelar
              </button>
              <button onClick={applyAdjust} disabled={adjusting || modal.points === 0}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                {adjusting ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpCircle size={16} />}
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

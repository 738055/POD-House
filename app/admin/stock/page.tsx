'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Package, Plus, ArrowDownCircle, ArrowUpCircle, RefreshCw,
  Search, TrendingUp, AlertTriangle, X, Loader2, Check,
  History, ChevronDown, ChevronUp,
} from 'lucide-react';

interface StockVariant {
  id: string;
  name: string;
  stock: number;
  cost_price: number | null;
  avg_cost: number | null;
  price_override: number | null;
  active: boolean;
  products: { id: string; name: string; base_price: number } | null;
}

interface StockEntry {
  id: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  cost_per_unit: number | null;
  notes: string | null;
  created_at: string;
  product_variants: {
    name: string;
    products: { name: string } | null;
  } | null;
}

type EntryType = 'in' | 'out' | 'adjustment';
type FilterType = 'all' | 'low' | 'out';

export default function StockPage() {
  const supabase = createClient();
  const { toast } = useToast();

  const [variants, setVariants] = useState<StockVariant[]>([]);
  const [entries, setEntries] = useState<StockEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showHistory, setShowHistory] = useState(false);
  const [historyLimit, setHistoryLimit] = useState(30);

  // Modal
  const [modalVariant, setModalVariant] = useState<StockVariant | null>(null);
  const [entryType, setEntryType] = useState<EntryType>('in');
  const [entryQty, setEntryQty] = useState('');
  const [entryCost, setEntryCost] = useState('');
  const [entryNotes, setEntryNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadVariants() {
    const { data } = await supabase
      .from('product_variants')
      .select('id, name, stock, cost_price, avg_cost, price_override, active, products(id, name, base_price)')
      .order('stock', { ascending: true });
    if (data) setVariants(data as unknown as StockVariant[]);
  }

  async function loadEntries() {
    const { data } = await supabase
      .from('stock_entries')
      .select('id, type, quantity, cost_per_unit, notes, created_at, product_variants(name, products(name))')
      .order('created_at', { ascending: false })
      .limit(historyLimit);
    if (data) setEntries(data as unknown as StockEntry[]);
  }

  async function load() {
    setLoading(true);
    await Promise.all([loadVariants(), loadEntries()]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { if (showHistory) loadEntries(); }, [historyLimit]);

  function openModal(variant: StockVariant) {
    setModalVariant(variant);
    setEntryType('in');
    setEntryQty('');
    setEntryCost(variant.cost_price != null ? String(variant.cost_price) : '');
    setEntryNotes('');
  }

  async function submitEntry() {
    if (!modalVariant || !entryQty) return;
    const qty = parseInt(entryQty);
    if (isNaN(qty) || qty <= 0) {
      toast('Informe uma quantidade válida maior que zero.', 'error');
      return;
    }
    if (entryCost) {
      const cost = parseFloat(entryCost.replace(',', '.'));
      if (isNaN(cost) || cost < 0) {
        toast('Custo unitário inválido.', 'error');
        return;
      }
    }
    setSaving(true);
    const cost = entryCost ? parseFloat(entryCost.replace(',', '.')) : null;

    const { data, error } = await supabase.rpc('add_stock_entry', {
      p_variant_id: modalVariant.id,
      p_type: entryType,
      p_quantity: qty,
      p_cost_per_unit: cost,
      p_notes: entryNotes.trim() || null,
    });

    if (error || data?.error) {
      toast(error?.message ?? data?.error ?? 'Erro desconhecido', 'error');
    } else {
      toast(`✓ Estoque atualizado! Saldo: ${data.new_stock} un.`);
      setModalVariant(null);
      await load();
    }
    setSaving(false);
  }

  function previewNewAvg(): string | null {
    if (!modalVariant || entryType !== 'in' || !entryQty || !entryCost) return null;
    const qty = parseInt(entryQty);
    const cost = parseFloat(entryCost.replace(',', '.'));
    if (isNaN(qty) || isNaN(cost) || qty <= 0 || cost <= 0) return null;
    const curStock = modalVariant.stock;
    const curAvg = modalVariant.avg_cost ?? 0;
    const newStock = curStock + qty;
    if (newStock <= 0) return null;
    const newAvg = ((curStock * curAvg) + (qty * cost)) / newStock;
    return `R$ ${newAvg.toFixed(2)}`;
  }

  function stockColor(stock: number) {
    if (stock === 0) return 'text-red-400';
    if (stock <= 5) return 'text-amber-400';
    return 'text-green-400';
  }

  function stockBg(stock: number) {
    if (stock === 0) return 'bg-red-500/10';
    if (stock <= 5) return 'bg-amber-500/10';
    return 'bg-green-500/10';
  }

  const filtered = variants.filter(v => {
    if (filter === 'low' && !(v.stock > 0 && v.stock <= 5)) return false;
    if (filter === 'out' && v.stock !== 0) return false;
    if (search) {
      const s = search.toLowerCase();
      return v.name.toLowerCase().includes(s) || (v.products?.name.toLowerCase().includes(s) ?? false);
    }
    return true;
  });

  const stats = {
    total: variants.length,
    low: variants.filter(v => v.stock > 0 && v.stock <= 5).length,
    out: variants.filter(v => v.stock === 0).length,
    totalValue: variants.reduce((s, v) => s + (v.stock * (v.avg_cost ?? 0)), 0),
  };

  const TYPE_CONFIG = {
    in:         { label: 'Entrada', icon: ArrowDownCircle, color: 'text-green-400', bg: 'bg-green-500/20 border-green-500', sign: '+' },
    out:        { label: 'Saída',   icon: ArrowUpCircle,   color: 'text-red-400',   bg: 'bg-red-500/20 border-red-500',   sign: '-' },
    adjustment: { label: 'Ajuste', icon: RefreshCw,        color: 'text-blue-400',  bg: 'bg-blue-500/20 border-blue-500', sign: '=' },
  } as const;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-600/10 rounded-2xl">
            <Package className="text-purple-500" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Controle de Estoque</h1>
            <p className="text-gray-400 text-sm">Entradas, saídas, custo de compra e custo médio</p>
          </div>
        </div>
        <button
          onClick={() => { setShowHistory(v => !v); }}
          className={`flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm border transition-colors ${showHistory ? 'bg-gray-800 border-gray-600 text-white' : 'border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800'}`}
        >
          <History size={16} />
          Histórico
          {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { key: 'all' as FilterType,  label: 'Total de Variantes', value: stats.total,   Icon: Package,       color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { key: 'low' as FilterType,  label: 'Estoque Baixo ≤5',   value: stats.low,     Icon: AlertTriangle, color: 'text-amber-400',  bg: 'bg-amber-500/10'  },
          { key: 'out' as FilterType,  label: 'Sem Estoque',         value: stats.out,     Icon: X,             color: 'text-red-400',    bg: 'bg-red-500/10'    },
          { key: null,                 label: 'Valor em Estoque',    value: `R$ ${stats.totalValue.toFixed(2)}`, Icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10' },
        ].map(s => (
          <button
            key={s.label}
            onClick={() => s.key !== null && setFilter(s.key)}
            className={`p-4 rounded-2xl border text-left transition-all ${s.key !== null && filter === s.key ? 'border-purple-500 bg-gray-800 shadow-lg shadow-purple-900/10' : 'border-gray-800 bg-gray-900 hover:border-gray-700'}`}
          >
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
              <s.Icon size={20} className={s.color} />
            </div>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-gray-400 text-xs mt-1 font-medium">{s.label}</p>
          </button>
        ))}
      </div>

      {/* History panel (collapsible) */}
      {showHistory && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h3 className="text-white font-bold flex items-center gap-2">
              <History size={16} className="text-purple-400" /> Últimas Movimentações
            </h3>
          </div>
          <div className="divide-y divide-gray-800/60 max-h-72 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {entries.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-10">Nenhuma movimentação registrada ainda.</p>
            )}
            {entries.map(entry => {
              const cfg = TYPE_CONFIG[entry.type];
              const Icon = cfg.icon;
              return (
                <div key={entry.id} className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-gray-800/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-1.5 rounded-lg ${cfg.bg.split(' ')[0]}`}>
                      <Icon size={14} className={cfg.color} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-xs font-semibold truncate">
                        {entry.product_variants?.products?.name ?? '—'} · {entry.product_variants?.name ?? '—'}
                      </p>
                      <p className="text-gray-500 text-[10px] mt-0.5">
                        {cfg.label} · {new Date(entry.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        {entry.notes ? ` · ${entry.notes}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-black text-sm ${cfg.color}`}>
                      {cfg.sign}{Math.abs(entry.quantity)} un
                    </p>
                    {entry.cost_per_unit != null && (
                      <p className="text-gray-500 text-[10px]">R$ {entry.cost_per_unit.toFixed(2)}/un</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {entries.length >= historyLimit && (
            <div className="px-5 py-3 border-t border-gray-800">
              <button
                onClick={() => setHistoryLimit(l => l + 30)}
                className="text-sm text-gray-400 hover:text-white font-semibold transition-colors"
              >
                Carregar mais
              </button>
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar produto ou variante..."
          className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-gray-600 transition-colors"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        {/* Desktop table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-800">
              <tr className="text-gray-400 text-[11px] uppercase tracking-wider">
                <th className="text-left px-5 py-4 font-bold">Produto / Variante</th>
                <th className="text-center px-4 py-4 font-bold">Estoque</th>
                <th className="text-center px-4 py-4 font-bold">Preço Venda</th>
                <th className="text-center px-4 py-4 font-bold">Custo Compra</th>
                <th className="text-center px-4 py-4 font-bold">Custo Médio</th>
                <th className="text-center px-4 py-4 font-bold">Margem</th>
                <th className="px-4 py-4" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-gray-500 py-14">
                    <Package size={32} className="mx-auto mb-3 opacity-20" />
                    <p>Nenhuma variante encontrada</p>
                  </td>
                </tr>
              )}
              {filtered.map(v => {
                const sellPrice = v.price_override ?? v.products?.base_price ?? 0;
                const margin = v.avg_cost && sellPrice > 0
                  ? ((sellPrice - v.avg_cost) / sellPrice * 100)
                  : null;
                return (
                  <tr key={v.id} className="border-b border-gray-800/40 hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-white leading-tight">{v.products?.name ?? '—'}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{v.name}</p>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className={`inline-flex flex-col items-center px-3 py-1.5 rounded-xl ${stockBg(v.stock)}`}>
                        <span className={`text-xl font-black leading-none ${stockColor(v.stock)}`}>{v.stock}</span>
                        <span className="text-[9px] text-gray-500 font-bold uppercase mt-0.5">un</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-white font-semibold text-sm">
                        {sellPrice > 0 ? `R$ ${sellPrice.toFixed(2)}` : <span className="text-gray-500">—</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-white font-semibold text-sm">
                        {v.cost_price != null ? `R$ ${v.cost_price.toFixed(2)}` : <span className="text-gray-500">—</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-white font-semibold text-sm">
                        {v.avg_cost != null ? `R$ ${v.avg_cost.toFixed(2)}` : <span className="text-gray-500">—</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {margin != null ? (
                        <span className={`text-xs font-black px-2 py-1 rounded-lg ${margin >= 30 ? 'bg-green-500/15 text-green-400' : margin >= 15 ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400'}`}>
                          {margin.toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-gray-500 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => openModal(v)}
                        className="flex items-center gap-1.5 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 hover:text-purple-300 font-bold px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap"
                      >
                        <Plus size={12} /> Mov.
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="lg:hidden divide-y divide-gray-800/50">
          {filtered.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              <Package size={32} className="mx-auto mb-3 opacity-20" />
              <p>Nenhuma variante encontrada</p>
            </div>
          )}
          {filtered.map(v => {
            const sellPrice = v.price_override ?? v.products?.base_price ?? 0;
            return (
              <div key={v.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-white">{v.products?.name ?? '—'}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{v.name}</p>
                  </div>
                  <div className={`text-center px-3 py-1.5 rounded-xl ${stockBg(v.stock)}`}>
                    <p className={`text-xl font-black leading-none ${stockColor(v.stock)}`}>{v.stock}</p>
                    <p className="text-[9px] text-gray-500 font-bold uppercase">un</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                  <div className="bg-gray-800 rounded-lg p-2">
                    <p className="text-gray-500 text-[9px] uppercase mb-1">Venda</p>
                    <p className="text-white font-bold">{sellPrice > 0 ? `R$ ${sellPrice.toFixed(2)}` : '—'}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-2">
                    <p className="text-gray-500 text-[9px] uppercase mb-1">Custo</p>
                    <p className="text-white font-bold">{v.cost_price != null ? `R$ ${v.cost_price.toFixed(2)}` : '—'}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-2">
                    <p className="text-gray-500 text-[9px] uppercase mb-1">Médio</p>
                    <p className="text-white font-bold">{v.avg_cost != null ? `R$ ${v.avg_cost.toFixed(2)}` : '—'}</p>
                  </div>
                </div>
                <button
                  onClick={() => openModal(v)}
                  className="w-full flex items-center justify-center gap-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 font-bold py-2 rounded-xl text-sm transition-all"
                >
                  <Plus size={14} /> Registrar Movimentação
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stock Entry Modal */}
      {modalVariant && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            {/* Modal header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-white font-black text-lg">Movimentação de Estoque</h3>
                <p className="text-gray-400 text-sm mt-0.5">{modalVariant.products?.name} · {modalVariant.name}</p>
              </div>
              <button
                onClick={() => setModalVariant(null)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Current info */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-gray-400 text-[9px] uppercase font-bold mb-1">Estoque Atual</p>
                <p className={`text-2xl font-black ${stockColor(modalVariant.stock)}`}>{modalVariant.stock}</p>
                <p className="text-gray-500 text-[9px] mt-0.5">unidades</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-gray-400 text-[9px] uppercase font-bold mb-1">Custo Compra</p>
                <p className="text-white font-bold text-sm">
                  {modalVariant.cost_price != null ? `R$ ${modalVariant.cost_price.toFixed(2)}` : '—'}
                </p>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-gray-400 text-[9px] uppercase font-bold mb-1">Custo Médio</p>
                <p className="text-white font-bold text-sm">
                  {modalVariant.avg_cost != null ? `R$ ${modalVariant.avg_cost.toFixed(2)}` : '—'}
                </p>
              </div>
            </div>

            {/* Type selector */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {(['in', 'out', 'adjustment'] as EntryType[]).map(t => {
                const cfg = TYPE_CONFIG[t];
                const Icon = cfg.icon;
                return (
                  <button
                    key={t}
                    onClick={() => setEntryType(t)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-bold transition-all border ${entryType === t ? cfg.bg : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:bg-gray-800'}`}
                  >
                    <Icon size={18} className={entryType === t ? cfg.color : 'text-gray-400'} />
                    <span className={entryType === t ? cfg.color : ''}>{cfg.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Type description */}
            <p className="text-gray-500 text-xs mb-4">
              {entryType === 'in' && '↓ Adiciona ao estoque atual. Informe o custo unitário para recalcular o custo médio.'}
              {entryType === 'out' && '↑ Subtrai do estoque atual. Útil para registrar vendas manuais ou perdas.'}
              {entryType === 'adjustment' && '= Define o estoque absoluto. O valor informado será o novo saldo.'}
            </p>

            {/* Quantity */}
            <div className="mb-4">
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1.5 block font-bold">
                {entryType === 'adjustment' ? 'Novo Saldo de Estoque' : 'Quantidade'}
              </label>
              <input
                type="number" min="1"
                value={entryQty}
                onChange={e => setEntryQty(e.target.value)}
                placeholder={entryType === 'adjustment' ? 'Novo total (ex: 50)' : 'Quantidade (ex: 10)'}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500 transition-colors"
              />
            </div>

            {/* Cost (only for "in") */}
            {entryType === 'in' && (
              <div className="mb-4">
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-1.5 block font-bold">
                  Custo Unitário — R$ <span className="text-gray-600 normal-case">(opcional)</span>
                </label>
                <input
                  type="text" inputMode="decimal"
                  value={entryCost}
                  onChange={e => setEntryCost(e.target.value)}
                  placeholder="Ex: 12,50"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500 transition-colors"
                />
                {previewNewAvg() && (
                  <div className="mt-2 flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2">
                    <TrendingUp size={13} className="text-purple-400 flex-shrink-0" />
                    <p className="text-xs text-purple-300">
                      Novo custo médio estimado: <strong>{previewNewAvg()}</strong>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="mb-5">
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1.5 block font-bold">
                Observações <span className="text-gray-600 normal-case">(opcional)</span>
              </label>
              <textarea
                value={entryNotes}
                onChange={e => setEntryNotes(e.target.value)}
                rows={2}
                placeholder="NF 1234, Fornecedor ABC, ajuste de inventário..."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500 resize-none transition-colors"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={submitEntry}
                disabled={saving || !entryQty || parseInt(entryQty) <= 0}
                className="flex-1 flex items-center justify-center gap-2 bg-white text-black font-black py-3 rounded-xl text-sm hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Confirmar
              </button>
              <button
                onClick={() => setModalVariant(null)}
                className="px-5 border border-gray-700 text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

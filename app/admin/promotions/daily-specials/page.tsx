'use client';

/**
 * SQL necessário (rode no Supabase SQL Editor):
 *
 * CREATE TABLE daily_specials (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   day_of_week integer CHECK (day_of_week >= 0 AND day_of_week <= 6),
 *   scheduled_date date,
 *   product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
 *   variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
 *   discount_type text NOT NULL DEFAULT 'none' CHECK (discount_type IN ('percentage','fixed','none')),
 *   discount_value numeric NOT NULL DEFAULT 0,
 *   highlight_label text NOT NULL DEFAULT 'PROMO DO DIA',
 *   active boolean NOT NULL DEFAULT true,
 *   created_at timestamptz NOT NULL DEFAULT now(),
 *   CONSTRAINT check_date_or_dow CHECK (
 *     (scheduled_date IS NOT NULL AND day_of_week IS NULL) OR
 *     (scheduled_date IS NULL AND day_of_week IS NOT NULL)
 *   )
 * );
 * ALTER TABLE daily_specials ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Public read active" ON daily_specials FOR SELECT USING (active = true);
 * CREATE POLICY "Admin full" ON daily_specials FOR ALL TO authenticated USING (true) WITH CHECK (true);
 */

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { DailySpecial, Product, ProductVariant } from '@/lib/supabase/types';
import { Plus, Pencil, Trash2, X, Loader2, ChevronLeft, ChevronRight, Flame, RefreshCw, Calendar, Check } from 'lucide-react';

const WEEKDAYS_LONG = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function pad(n: number) { return n.toString().padStart(2, '0'); }
function isoDate(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function displayDate(d: Date) { return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; }

function getWeekDates(base: Date): Date[] {
  const d = new Date(base);
  d.setDate(d.getDate() - d.getDay());
  return Array.from({ length: 7 }, () => { const r = new Date(d); d.setDate(d.getDate() + 1); return r; });
}

function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

function discountedPrice(base: number, type: DailySpecial['discount_type'], value: number): number {
  if (type === 'percentage') return base * (1 - value / 100);
  if (type === 'fixed') return Math.max(0, base - value);
  return base;
}

const EMPTY_FORM = {
  type: 'date' as 'date' | 'recurring',
  scheduled_date: '',
  day_of_week: 0,
  product_id: '',
  variant_id: '',
  discount_type: 'none' as DailySpecial['discount_type'],
  discount_value: 0,
  highlight_label: 'PROMO DO DIA',
  active: true,
};

type ProductWithVariants = Product & { product_variants: ProductVariant[] };

export default function DailySpecialsPage() {
  const supabase = createClient();
  const todayBase = useMemo(() => new Date(), []);
  const [weekOffset, setWeekOffset] = useState(0);
  const baseDate = useMemo(() => {
    const d = new Date(todayBase);
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset, todayBase]);
  const weekDates = useMemo(() => getWeekDates(baseDate), [baseDate]);

  const [specials, setSpecials] = useState<DailySpecial[]>([]);
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => { loadData(); }, [weekOffset]);

  async function loadData() {
    setLoading(true);
    const [specialsRes, productsRes] = await Promise.all([
      supabase
        .from('daily_specials')
        .select('*, products(id,name,base_price,description,puffs,product_variants(id,product_id,name,image_url,price_override,stock,active,sort_order)), product_variants(id,product_id,name,image_url,price_override,stock,active)')
        .order('created_at', { ascending: true }),
      supabase
        .from('products')
        .select('id,name,base_price,product_variants(id,product_id,name,image_url,price_override,stock,active,sort_order)')
        .eq('active', true)
        .order('name'),
    ]);
    if (specialsRes.data) setSpecials(specialsRes.data as DailySpecial[]);
    if (productsRes.data) setProducts(productsRes.data as ProductWithVariants[]);
    setLoading(false);
  }

  function specialsForDay(date: Date): DailySpecial[] {
    const dateStr = isoDate(date);
    const dow = date.getDay();
    const exact = specials.filter(s => s.scheduled_date === dateStr);
    const recurring = specials.filter(s => !s.scheduled_date && s.day_of_week === dow);
    // Exact date overrides recurring for the same product
    const exactProductIds = new Set(exact.map(s => s.product_id));
    return [...exact, ...recurring.filter(s => !exactProductIds.has(s.product_id))];
  }

  function openNew(date: Date) {
    setForm({ ...EMPTY_FORM, scheduled_date: isoDate(date), day_of_week: date.getDay() });
    setProductSearch('');
    setFormError(null);
    setEditId('new');
  }

  function openEdit(s: DailySpecial) {
    setForm({
      type: s.scheduled_date ? 'date' : 'recurring',
      scheduled_date: s.scheduled_date ?? '',
      day_of_week: s.day_of_week ?? 0,
      product_id: s.product_id,
      variant_id: s.variant_id ?? '',
      discount_type: s.discount_type,
      discount_value: s.discount_value,
      highlight_label: s.highlight_label,
      active: s.active,
    });
    setProductSearch('');
    setFormError(null);
    setEditId(s.id);
  }

  async function save() {
    if (!form.product_id) { setFormError('Selecione um produto.'); return; }
    if (form.type === 'date' && !form.scheduled_date) { setFormError('Informe a data.'); return; }
    setSaving(true);
    setFormError(null);
    const payload = {
      scheduled_date: form.type === 'date' ? form.scheduled_date : null,
      day_of_week: form.type === 'recurring' ? form.day_of_week : null,
      product_id: form.product_id,
      variant_id: form.variant_id || null,
      discount_type: form.discount_type,
      discount_value: form.discount_type === 'none' ? 0 : form.discount_value,
      highlight_label: form.highlight_label || 'PROMO DO DIA',
      active: form.active,
    };
    if (editId === 'new') {
      await supabase.from('daily_specials').insert(payload);
    } else {
      await supabase.from('daily_specials').update(payload).eq('id', editId!);
    }
    setEditId(null);
    setSaving(false);
    loadData();
  }

  async function remove(id: string) {
    setDeleting(id);
    await supabase.from('daily_specials').delete().eq('id', id);
    setDeleting(null);
    loadData();
  }

  const selectedProduct = products.find(p => p.id === form.product_id);
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));
  const todayStr = isoDate(todayBase);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Flame size={28} className="text-orange-400" /> Produtos do Dia
          </h1>
          <p className="text-gray-400 mt-1">Configure qual produto ou sabor ficará em destaque a cada dia</p>
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setWeekOffset(w => w - 1)} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-white">
          <ChevronLeft size={18} />
        </button>
        <span className="text-white font-semibold text-sm min-w-[200px] text-center">
          {displayDate(weekDates[0])} — {displayDate(weekDates[6])} de {weekDates[6].getFullYear()}
        </span>
        <button onClick={() => setWeekOffset(w => w + 1)} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-white">
          <ChevronRight size={18} />
        </button>
        {weekOffset !== 0 && (
          <button onClick={() => setWeekOffset(0)} className="text-xs text-purple-400 hover:text-purple-300 px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 transition-colors">
            Hoje
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-16"><Loader2 size={32} className="animate-spin text-gray-400" /></div>
      ) : (
        <>
          {/* Week grid */}
          <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
            {weekDates.map(date => {
              const dateStr = isoDate(date);
              const isToday = dateStr === todayStr;
              const daySpecials = specialsForDay(date);
              return (
                <div key={dateStr} className={`rounded-xl border ${isToday ? 'border-orange-500/50 bg-orange-500/5' : 'border-gray-700 bg-gray-900'} flex flex-col min-h-[160px]`}>
                  {/* Day header */}
                  <div className={`px-3 py-2 border-b ${isToday ? 'border-orange-500/30' : 'border-gray-700'} flex items-center justify-between`}>
                    <div>
                      <p className={`text-xs font-bold uppercase ${isToday ? 'text-orange-400' : 'text-gray-400'}`}>{WEEKDAYS_SHORT[date.getDay()]}</p>
                      <p className={`text-sm font-bold ${isToday ? 'text-orange-300' : 'text-white'}`}>{pad(date.getDate())}/{pad(date.getMonth() + 1)}</p>
                    </div>
                    {isToday && <span className="text-[10px] bg-orange-500 text-white font-bold px-1.5 py-0.5 rounded-full">HOJE</span>}
                  </div>

                  {/* Specials list */}
                  <div className="flex-1 p-2 space-y-1.5">
                    {daySpecials.length === 0 && (
                      <p className="text-xs text-gray-600 text-center py-2">sem produto do dia</p>
                    )}
                    {daySpecials.map(s => {
                      const productName = s.products?.name ?? '—';
                      const variantName = s.product_variants?.name;
                      const basePrice = s.product_variants?.price_override ?? s.products?.base_price ?? 0;
                      const finalPrice = discountedPrice(basePrice, s.discount_type, s.discount_value);
                      return (
                        <div key={s.id} className={`rounded-lg p-2 border text-xs ${s.active ? 'border-purple-500/30 bg-purple-500/10' : 'border-gray-700 bg-gray-800/50 opacity-60'}`}>
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <div className="min-w-0">
                              <p className="font-bold text-white leading-tight truncate">{productName}</p>
                              {variantName && <p className="text-purple-300 truncate">{variantName}</p>}
                              {!variantName && <p className="text-gray-500 italic">todos os sabores</p>}
                            </div>
                            {!s.scheduled_date && (
                              <RefreshCw size={10} className="text-blue-400 flex-shrink-0 mt-0.5" title="Recorrente" />
                            )}
                          </div>
                          {s.discount_type !== 'none' && (
                            <div className="flex items-center gap-1">
                              <span className="bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded font-bold">
                                {s.discount_type === 'percentage' ? `-${s.discount_value}%` : `-${fmt(s.discount_value)}`}
                              </span>
                              <span className="text-gray-300">{fmt(finalPrice)}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1 mt-1.5">
                            <button onClick={() => openEdit(s)} className="flex-1 flex items-center justify-center gap-1 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-[10px] transition-colors">
                              <Pencil size={10} /> Editar
                            </button>
                            <button onClick={() => remove(s.id)} disabled={deleting === s.id} className="flex items-center justify-center w-6 h-5 rounded bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-colors">
                              {deleting === s.id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add button */}
                  <button onClick={() => openNew(date)} className="m-2 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-dashed border-gray-600 hover:border-purple-500 hover:bg-purple-500/10 text-gray-500 hover:text-purple-400 transition-colors text-xs">
                    <Plus size={12} /> Adicionar
                  </button>
                </div>
              );
            })}
          </div>

          {/* Recurring specials legend */}
          <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
            <RefreshCw size={12} className="text-blue-400" />
            <span>Ícone azul = recorrente (aparece toda semana nesse dia)</span>
          </div>
        </>
      )}

      {/* Form modal */}
      {editId !== null && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl border border-gray-700 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white flex-1">
                {editId === 'new' ? 'Novo Produto do Dia' : 'Editar Produto do Dia'}
              </h2>
              <button onClick={() => setEditId(null)} className="p-1.5 rounded-full hover:bg-gray-700 transition-colors text-gray-400">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              {formError && <div className="bg-red-500/10 text-red-400 text-sm px-3 py-2 rounded-lg border border-red-500/20">{formError}</div>}

              {/* Type: date vs recurring */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Tipo</label>
                <div className="flex gap-2">
                  {(['date', 'recurring'] as const).map(t => (
                    <button key={t} onClick={() => setForm(p => ({ ...p, type: t }))}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${form.type === t ? 'bg-purple-600 border-purple-600 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                      {t === 'date' ? <Calendar size={15} /> : <RefreshCw size={15} />}
                      {t === 'date' ? 'Data específica' : 'Recorrente'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date or day_of_week */}
              {form.type === 'date' ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Data *</label>
                  <input type="date" value={form.scheduled_date} onChange={e => setForm(p => ({ ...p, scheduled_date: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Dia da semana</label>
                  <div className="grid grid-cols-7 gap-1">
                    {WEEKDAYS_SHORT.map((d, i) => (
                      <button key={i} onClick={() => setForm(p => ({ ...p, day_of_week: i }))}
                        className={`py-2 rounded-lg text-xs font-bold transition-colors ${form.day_of_week === i ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Product search + select */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Produto *</label>
                <input type="text" placeholder="Buscar produto..." value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 mb-2" />
                <div className="max-h-40 overflow-y-auto space-y-1 border border-gray-700 rounded-xl p-1 bg-gray-800">
                  {filteredProducts.length === 0 && <p className="text-xs text-gray-500 text-center py-3">Nenhum produto encontrado</p>}
                  {filteredProducts.map(p => (
                    <button key={p.id} onClick={() => setForm(prev => ({ ...prev, product_id: p.id, variant_id: '' }))}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${form.product_id === p.id ? 'bg-purple-600 text-white' : 'hover:bg-gray-700 text-gray-300'}`}>
                      <span className="truncate text-left">{p.name}</span>
                      <span className="text-xs opacity-70 flex-shrink-0 ml-2">{fmt(p.base_price)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Variant selector */}
              {selectedProduct && selectedProduct.product_variants.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Sabor / Variante</label>
                  <div className="space-y-1 max-h-36 overflow-y-auto border border-gray-700 rounded-xl p-1 bg-gray-800">
                    <button onClick={() => setForm(p => ({ ...p, variant_id: '' }))}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${!form.variant_id ? 'bg-purple-600 text-white' : 'hover:bg-gray-700 text-gray-300'}`}>
                      {!form.variant_id && <Check size={14} />}
                      <span>Todos os sabores</span>
                    </button>
                    {selectedProduct.product_variants.filter(v => v.active).map(v => (
                      <button key={v.id} onClick={() => setForm(p => ({ ...p, variant_id: v.id }))}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${form.variant_id === v.id ? 'bg-purple-600 text-white' : 'hover:bg-gray-700 text-gray-300'}`}>
                        <div className="flex items-center gap-2">
                          {form.variant_id === v.id && <Check size={14} />}
                          <span>{v.name}</span>
                        </div>
                        {v.price_override != null && <span className="text-xs opacity-70">{fmt(v.price_override)}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Discount */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Desconto</label>
                <div className="flex gap-2 mb-3">
                  {(['none', 'percentage', 'fixed'] as const).map(t => (
                    <button key={t} onClick={() => setForm(p => ({ ...p, discount_type: t }))}
                      className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition-colors ${form.discount_type === t ? 'bg-purple-600 border-purple-600 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                      {t === 'none' ? 'Sem desconto' : t === 'percentage' ? 'Percentual (%)' : 'Valor fixo (R$)'}
                    </button>
                  ))}
                </div>
                {form.discount_type !== 'none' && (
                  <input type="number" min={0} step={form.discount_type === 'percentage' ? 1 : 0.01}
                    value={form.discount_value}
                    onChange={e => setForm(p => ({ ...p, discount_value: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder={form.discount_type === 'percentage' ? 'Ex: 20 (%)' : 'Ex: 10.00 (R$)'} />
                )}
              </div>

              {/* Highlight label */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Etiqueta de destaque</label>
                <input type="text" value={form.highlight_label}
                  onChange={e => setForm(p => ({ ...p, highlight_label: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Ex: PROMO DO DIA, OFERTA ESPECIAL..." />
              </div>

              {/* Active */}
              <label className="flex items-center gap-3 cursor-pointer py-1">
                <div onClick={() => setForm(p => ({ ...p, active: !p.active }))}
                  className={`w-10 h-6 rounded-full relative transition-colors ${form.active ? 'bg-purple-600' : 'bg-gray-700'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.active ? 'left-4' : 'left-0.5'}`} />
                </div>
                <span className="text-sm text-gray-300 font-medium">Ativo</span>
              </label>
            </div>

            <div className="px-5 py-4 border-t border-gray-700">
              <button onClick={save} disabled={saving} className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors disabled:bg-purple-800 text-sm">
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

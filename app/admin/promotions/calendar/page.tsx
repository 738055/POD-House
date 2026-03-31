'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ScheduledPromotion, Promotion, Coupon } from '@/lib/supabase/types';
import { Plus, Pencil, Trash2, Check, X, Loader2, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const COLORS = ['#8B5CF6', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#6366F1', '#14B8A6'];

function pad(n: number) { return n.toString().padStart(2, '0'); }

function getWeekDates(baseDate: Date): Date[] {
  const d = new Date(baseDate);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  const week: Date[] = [];
  for (let i = 0; i < 7; i++) {
    week.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return week;
}

function formatDateISO(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const EMPTY = {
  title: '', description: '', promotion_id: '' as string, coupon_id: '' as string,
  scheduled_date: '', start_time: '00:00', end_time: '23:59', color: '#8B5CF6', active: true,
};

export default function PromotionCalendarPage() {
  const supabase = createClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [items, setItems] = useState<ScheduledPromotion[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  const today = new Date();
  const baseDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const weekDates = useMemo(() => getWeekDates(baseDate), [baseDate]);
  const weekStart = formatDateISO(weekDates[0]);
  const weekEnd = formatDateISO(weekDates[6]);

  // Month view helpers
  const monthStart = useMemo(() => {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    return d;
  }, [baseDate]);

  const monthDays = useMemo(() => {
    const year = monthStart.getFullYear();
    const month = monthStart.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  }, [monthStart]);

  async function load() {
    setLoading(true);
    const [schRes, promoRes, couponRes] = await Promise.all([
      supabase.from('scheduled_promotions').select('*, promotions(*), coupons(*)').order('scheduled_date'),
      supabase.from('promotions').select('id, title').order('title'),
      supabase.from('coupons').select('id, code, description').order('code'),
    ]);
    if (schRes.data) setItems(schRes.data as ScheduledPromotion[]);
    if (promoRes.data) setPromotions(promoRes.data as Promotion[]);
    if (couponRes.data) setCoupons(couponRes.data as Coupon[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(row?: ScheduledPromotion, prefilledDate?: string) {
    if (row) {
      setForm({
        title: row.title, description: row.description ?? '', promotion_id: row.promotion_id ?? '',
        coupon_id: row.coupon_id ?? '', scheduled_date: row.scheduled_date,
        start_time: row.start_time, end_time: row.end_time, color: row.color, active: row.active,
      });
      setEditId(row.id);
    } else {
      setForm({ ...EMPTY, scheduled_date: prefilledDate || formatDateISO(today) });
      setEditId('new');
    }
  }

  async function save() {
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description || null,
      promotion_id: form.promotion_id || null,
      coupon_id: form.coupon_id || null,
      scheduled_date: form.scheduled_date,
      start_time: form.start_time,
      end_time: form.end_time,
      color: form.color,
      active: form.active,
    };
    if (editId === 'new') await supabase.from('scheduled_promotions').insert(payload);
    else await supabase.from('scheduled_promotions').update(payload).eq('id', editId!);
    setEditId(null);
    await load();
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm('Excluir promoção agendada?')) return;
    await supabase.from('scheduled_promotions').delete().eq('id', id);
    setItems(r => r.filter(x => x.id !== id));
  }

  function getItemsForDate(date: string) {
    return items.filter(i => i.scheduled_date === date);
  }

  const weekLabel = `${weekDates[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - ${weekDates[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  const monthLabel = monthStart.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarDays size={24} /> Calendário de Promoções
          </h1>
          <p className="text-gray-400 text-sm mt-1">Organize as promoções da semana</p>
        </div>
        <button onClick={() => startEdit()} className="flex items-center gap-2 bg-purple-600 text-white font-semibold px-4 py-2 rounded-xl text-sm hover:bg-purple-700">
          <Plus size={16} /> Agendar Promoção
        </button>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(w => w - 1)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
            <ChevronLeft size={18} />
          </button>
          <span className="text-white font-semibold text-sm min-w-[200px] text-center">
            {viewMode === 'week' ? weekLabel : monthLabel}
          </span>
          <button onClick={() => setWeekOffset(w => w + 1)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
            <ChevronRight size={18} />
          </button>
          <button onClick={() => setWeekOffset(0)} className="text-xs text-purple-400 hover:text-purple-300 ml-2">Hoje</button>
        </div>
        <div className="flex bg-gray-800 rounded-lg overflow-hidden">
          <button onClick={() => setViewMode('week')}
            className={`px-3 py-1.5 text-xs font-semibold ${viewMode === 'week' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}>
            Semana
          </button>
          <button onClick={() => setViewMode('month')}
            className={`px-3 py-1.5 text-xs font-semibold ${viewMode === 'month' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}>
            Mês
          </button>
        </div>
      </div>

      {/* Edit Form */}
      {editId && (
        <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
          <h2 className="text-lg font-bold mb-4">{editId === 'new' ? 'Agendar Promoção' : 'Editar Agendamento'}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Título *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ex: Terça Maluca - 30% OFF"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Data *</label>
              <input type="date" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500" />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Início</label>
                <input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Fim</label>
                <input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Vincular Promoção (opcional)</label>
              <select value={form.promotion_id} onChange={e => setForm(f => ({ ...f, promotion_id: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500">
                <option value="">Nenhuma</option>
                {promotions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Vincular Cupom (opcional)</label>
              <select value={form.coupon_id} onChange={e => setForm(f => ({ ...f, coupon_id: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500">
                <option value="">Nenhum</option>
                {coupons.map(c => <option key={c.id} value={c.id}>{c.code} — {c.description}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Descrição</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2} placeholder="Detalhes da promoção..."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Cor</label>
              <div className="flex gap-2">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                    className={`w-8 h-8 rounded-full border-2 ${form.color === c ? 'border-white' : 'border-transparent'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="spactive" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4" />
              <label htmlFor="spactive" className="text-sm text-gray-300">Ativo</label>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={save} disabled={saving || !form.title || !form.scheduled_date}
              className="flex items-center gap-2 bg-purple-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm disabled:opacity-40 hover:bg-purple-700">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Salvar
            </button>
            <button onClick={() => setEditId(null)} className="flex items-center gap-2 border border-gray-700 text-gray-300 px-5 py-2.5 rounded-xl text-sm">
              <X size={16} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 py-12 text-center">Carregando...</div>
      ) : viewMode === 'week' ? (
        /* Weekly View */
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((date, idx) => {
            const dateStr = formatDateISO(date);
            const dayItems = getItemsForDate(dateStr);
            const isToday = formatDateISO(today) === dateStr;

            return (
              <div key={idx} className={`bg-gray-900 rounded-xl border ${isToday ? 'border-purple-500' : 'border-gray-800'} min-h-[200px] flex flex-col`}>
                <div className={`px-3 py-2 border-b ${isToday ? 'border-purple-500 bg-purple-500/10' : 'border-gray-800'} text-center`}>
                  <p className="text-xs text-gray-400 uppercase">{WEEKDAYS[idx]}</p>
                  <p className={`text-lg font-bold ${isToday ? 'text-purple-400' : 'text-white'}`}>{date.getDate()}</p>
                </div>
                <div className="flex-1 p-2 space-y-1.5">
                  {dayItems.map(item => (
                    <div key={item.id} className="rounded-lg p-2 cursor-pointer hover:opacity-80 group relative"
                      style={{ backgroundColor: item.color + '20', borderLeft: `3px solid ${item.color}` }}
                      onClick={() => startEdit(item)}>
                      <p className="text-xs font-semibold text-white leading-tight">{item.title}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{item.start_time} - {item.end_time}</p>
                      {item.coupons && <p className="text-[10px] text-amber-400 font-mono mt-0.5">{(item.coupons as Coupon).code}</p>}
                      <button onClick={(e) => { e.stopPropagation(); remove(item.id); }}
                        className="absolute top-1 right-1 p-0.5 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100">
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => startEdit(undefined, dateStr)}
                    className="w-full text-gray-600 hover:text-gray-400 hover:bg-gray-800/50 rounded-lg p-1 text-center">
                    <Plus size={14} className="mx-auto" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Monthly View */
        <div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-xs text-gray-500 uppercase py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((date, idx) => {
              if (!date) return <div key={`empty-${idx}`} className="bg-gray-900/30 rounded-lg min-h-[80px]" />;
              const dateStr = formatDateISO(date);
              const dayItems = getItemsForDate(dateStr);
              const isToday = formatDateISO(today) === dateStr;

              return (
                <div key={dateStr}
                  className={`bg-gray-900 rounded-lg border ${isToday ? 'border-purple-500' : 'border-gray-800/50'} min-h-[80px] p-1.5 cursor-pointer hover:border-gray-600`}
                  onClick={() => startEdit(undefined, dateStr)}>
                  <p className={`text-xs font-semibold mb-1 ${isToday ? 'text-purple-400' : 'text-gray-400'}`}>{date.getDate()}</p>
                  {dayItems.slice(0, 2).map(item => (
                    <div key={item.id} className="rounded px-1 py-0.5 mb-0.5 text-[10px] font-semibold text-white truncate"
                      style={{ backgroundColor: item.color + '40' }}
                      onClick={(e) => { e.stopPropagation(); startEdit(item); }}>
                      {item.title}
                    </div>
                  ))}
                  {dayItems.length > 2 && (
                    <p className="text-[10px] text-gray-500">+{dayItems.length - 2} mais</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming promotions list */}
      <div className="mt-8">
        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wide mb-3">Próximas Promoções Agendadas</h3>
        <div className="space-y-2">
          {items
            .filter(i => i.scheduled_date >= formatDateISO(today))
            .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
            .slice(0, 10)
            .map(item => (
              <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <div>
                    <p className="text-white font-semibold text-sm">{item.title}</p>
                    <p className="text-gray-400 text-xs">
                      {new Date(item.scheduled_date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                      {' '}| {item.start_time} - {item.end_time}
                      {item.coupons && <span className="text-amber-400 ml-2 font-mono">{(item.coupons as Coupon).code}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => startEdit(item)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => remove(item.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          {items.filter(i => i.scheduled_date >= formatDateISO(today)).length === 0 && (
            <div className="text-gray-500 text-center py-8">Nenhuma promoção agendada.</div>
          )}
        </div>
      </div>
    </div>
  );
}

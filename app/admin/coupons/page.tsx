'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Coupon } from '@/lib/supabase/types';
import { Plus, Pencil, Trash2, Check, X, Loader2, Copy } from 'lucide-react';

const EMPTY = {
  code: '', description: '', type: 'percentage' as Coupon['type'],
  value: 10, min_order_value: 0, max_uses_total: null as number | null,
  max_uses_per_user: 1, valid_from: new Date().toISOString().slice(0,10),
  valid_until: '' as string, active: true,
};

export default function CouponsPage() {
  const supabase = createClient();
  const [rows, setRows]       = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId]   = useState<string | 'new' | null>(null);
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);

  async function load() {
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    if (data) setRows(data as Coupon[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(row?: Coupon) {
    if (row) {
      setForm({
        code: row.code, description: row.description ?? '', type: row.type,
        value: row.value, min_order_value: row.min_order_value,
        max_uses_total: row.max_uses_total, max_uses_per_user: row.max_uses_per_user,
        valid_from: row.valid_from.slice(0,10),
        valid_until: row.valid_until ? row.valid_until.slice(0,10) : '',
        active: row.active,
      });
      setEditId(row.id);
    } else {
      setForm(EMPTY);
      setEditId('new');
    }
  }

  async function save() {
    setSaving(true);
    const payload = {
      code: form.code.toUpperCase().trim(),
      description: form.description || null,
      type: form.type, value: Number(form.value),
      min_order_value: Number(form.min_order_value),
      max_uses_total: form.max_uses_total ? Number(form.max_uses_total) : null,
      max_uses_per_user: Number(form.max_uses_per_user),
      valid_from: form.valid_from || new Date().toISOString(),
      valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
      active: form.active,
    };
    if (editId === 'new') await supabase.from('coupons').insert(payload);
    else await supabase.from('coupons').update(payload).eq('id', editId!);
    setEditId(null);
    await load();
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm('Excluir cupom?')) return;
    await supabase.from('coupons').delete().eq('id', id);
    setRows(r => r.filter(x => x.id !== id));
  }

  const typeLabel = (t: Coupon['type']) => t === 'percentage' ? '%' : t === 'fixed' ? 'R$' : 'Frete Grátis';

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Cupons</h1>
          <p className="text-gray-400 text-sm mt-1">Gerencie cupons de desconto</p>
        </div>
        <button onClick={() => startEdit()} className="flex items-center gap-2 bg-white text-black font-semibold px-4 py-2 rounded-xl text-sm">
          <Plus size={16} /> Novo Cupom
        </button>
      </div>

      {editId && (
        <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
          <h2 className="text-lg font-bold mb-4">{editId === 'new' ? 'Novo Cupom' : 'Editar Cupom'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Código *</label>
              <input value={form.code} onChange={e => setForm(f=>({...f,code:e.target.value.toUpperCase()}))}
                placeholder="DESCONTO10"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white font-mono uppercase text-sm focus:outline-none focus:border-gray-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Tipo *</label>
              <select value={form.type} onChange={e => setForm(f=>({...f,type:e.target.value as Coupon['type']}))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500">
                <option value="percentage">Percentual (%)</option>
                <option value="fixed">Valor Fixo (R$)</option>
                <option value="free_delivery">Frete Grátis</option>
              </select>
            </div>
            {form.type !== 'free_delivery' && (
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">
                  {form.type === 'percentage' ? 'Desconto (%)' : 'Desconto (R$)'}
                </label>
                <input type="number" min="0" step={form.type === 'percentage' ? '1' : '0.50'}
                  value={form.value} onChange={e => setForm(f=>({...f,value:parseFloat(e.target.value)}))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500" />
              </div>
            )}
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Pedido Mínimo (R$)</label>
              <input type="number" min="0" step="5" value={form.min_order_value}
                onChange={e => setForm(f=>({...f,min_order_value:parseFloat(e.target.value)}))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Usos Totais (vazio = ilimitado)</label>
              <input type="number" min="1" value={form.max_uses_total ?? ''}
                onChange={e => setForm(f=>({...f,max_uses_total:e.target.value ? parseInt(e.target.value) : null}))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Usos por Usuário</label>
              <input type="number" min="1" value={form.max_uses_per_user}
                onChange={e => setForm(f=>({...f,max_uses_per_user:parseInt(e.target.value)}))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Válido a partir de</label>
              <input type="date" value={form.valid_from} onChange={e => setForm(f=>({...f,valid_from:e.target.value}))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Válido até (vazio = sem expiração)</label>
              <input type="date" value={form.valid_until} onChange={e => setForm(f=>({...f,valid_until:e.target.value}))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Descrição</label>
              <input value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500" />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="cactive" checked={form.active} onChange={e => setForm(f=>({...f,active:e.target.checked}))} className="w-4 h-4" />
              <label htmlFor="cactive" className="text-sm text-gray-300">Ativo</label>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={save} disabled={saving || !form.code}
              className="flex items-center gap-2 bg-white text-black font-semibold px-5 py-2.5 rounded-xl text-sm disabled:opacity-40">
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
      ) : (
        <>
          {/* Tabela para Desktop */}
          <div className="hidden md:block bg-gray-900 rounded-2xl border border-gray-800 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-800">
                <tr className="text-gray-400 text-xs uppercase tracking-wide">
                  <th className="text-left px-6 py-4">Código</th>
                  <th className="text-left px-4 py-4">Tipo</th>
                  <th className="text-left px-4 py-4">Desconto</th>
                  <th className="text-left px-4 py-4">Mínimo</th>
                  <th className="text-left px-4 py-4">Usos</th>
                  <th className="text-left px-4 py-4">Validade</th>
                  <th className="text-left px-4 py-4">Status</th>
                  <th className="px-4 py-4" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.id} className={`border-b border-gray-800/50 ${i % 2 === 0 ? '' : 'bg-gray-800/20'}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white bg-gray-800 px-2 py-0.5 rounded">{row.code}</span>
                        <button onClick={() => navigator.clipboard.writeText(row.code)} className="text-gray-500 hover:text-white"><Copy size={12} /></button>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-300">{typeLabel(row.type)}</td>
                    <td className="px-4 py-4 text-white font-semibold">
                      {row.type === 'free_delivery' ? 'Grátis' : row.type === 'percentage' ? `${row.value}%` : `R$ ${row.value.toFixed(2)}`}
                    </td>
                    <td className="px-4 py-4 text-gray-300">{row.min_order_value > 0 ? `R$ ${row.min_order_value.toFixed(2)}` : '—'}</td>
                    <td className="px-4 py-4 text-gray-300">{row.current_uses}{row.max_uses_total ? `/${row.max_uses_total}` : ''}</td>
                    <td className="px-4 py-4 text-gray-300 text-xs">{row.valid_until ? new Date(row.valid_until).toLocaleDateString('pt-BR') : '∞'}</td>
                    <td className="px-4 py-4">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${row.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                        {row.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => startEdit(row)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"><Pencil size={14} /></button>
                        <button onClick={() => remove(row.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards para Mobile */}
          <div className="md:hidden space-y-4">
            {rows.map((row) => (
              <div key={row.id} className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white bg-gray-800 px-2 py-0.5 rounded">{row.code}</span>
                      <button onClick={() => navigator.clipboard.writeText(row.code)} className="text-gray-500 hover:text-white"><Copy size={12} /></button>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{row.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => startEdit(row)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"><Pencil size={14} /></button>
                    <button onClick={() => remove(row.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 text-sm">
                  <div>
                    <p className="text-gray-400">Desconto:</p>
                    <p className="font-semibold text-white">{row.type === 'free_delivery' ? 'Grátis' : row.type === 'percentage' ? `${row.value}%` : `R$ ${row.value.toFixed(2)}`}</p>
                  </div>
                   <div>
                    <p className="text-gray-400">Pedido Mínimo:</p>
                    <p className="text-white">{row.min_order_value > 0 ? `R$ ${row.min_order_value.toFixed(2)}` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Usos:</p>
                    <p className="text-white">{row.current_uses}{row.max_uses_total ? `/${row.max_uses_total}` : ''}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Validade:</p>
                    <p className="text-white text-xs">{row.valid_until ? new Date(row.valid_until).toLocaleDateString('pt-BR') : '∞'}</p>
                  </div>
                </div>
                 <div className="mt-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${row.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                      {row.active ? 'Ativo' : 'Inativo'}
                    </span>
                 </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Neighborhood } from '@/lib/supabase/types';
import { Plus, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react';

const EMPTY = { name: '', cep_prefix: '', delivery_fee: 5, estimated_minutes: 45, active: true };

export default function NeighborhoodsPage() {
  const supabase = createClient();
  const [rows, setRows]       = useState<Neighborhood[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId]   = useState<string | 'new' | null>(null);
  const [form, setForm]       = useState<typeof EMPTY>(EMPTY);
  const [saving, setSaving]   = useState(false);

  async function load() {
    const { data } = await supabase.from('neighborhoods').select('*').order('name');
    if (data) setRows(data as Neighborhood[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(row?: Neighborhood) {
    if (row) { setForm({ name: row.name, cep_prefix: row.cep_prefix ?? '', delivery_fee: row.delivery_fee, estimated_minutes: row.estimated_minutes, active: row.active }); setEditId(row.id); }
    else     { setForm(EMPTY); setEditId('new'); }
  }

  async function save() {
    setSaving(true);
    const payload = { name: form.name.trim(), cep_prefix: form.cep_prefix || null, delivery_fee: Number(form.delivery_fee), estimated_minutes: Number(form.estimated_minutes), active: form.active };
    if (editId === 'new') {
      await supabase.from('neighborhoods').insert(payload);
    } else {
      await supabase.from('neighborhoods').update(payload).eq('id', editId!);
    }
    setEditId(null);
    await load();
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm('Excluir bairro?')) return;
    await supabase.from('neighborhoods').delete().eq('id', id);
    setRows(r => r.filter(x => x.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Bairros & Frete</h1>
          <p className="text-gray-400 text-sm mt-1">Taxa de entrega e tempo por bairro</p>
        </div>
        <button onClick={() => startEdit()} className="flex items-center gap-2 bg-white text-black font-semibold px-4 py-2 rounded-xl text-sm">
          <Plus size={16} /> Novo Bairro
        </button>
      </div>

      {editId && (
        <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
          <h2 className="text-lg font-bold mb-4">{editId === 'new' ? 'Novo Bairro' : 'Editar Bairro'}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Nome do Bairro *</label>
              <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Prefixo CEP (5 dígitos)</label>
              <input value={form.cep_prefix} onChange={e => setForm(f=>({...f,cep_prefix:e.target.value.slice(0,5)}))}
                placeholder="86010"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Taxa de Entrega (R$)</label>
              <input type="number" step="0.50" min="0" value={form.delivery_fee} onChange={e => setForm(f=>({...f,delivery_fee:parseFloat(e.target.value)}))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Tempo Estimado (min)</label>
              <input type="number" min="10" value={form.estimated_minutes} onChange={e => setForm(f=>({...f,estimated_minutes:parseInt(e.target.value)}))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500" />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="active" checked={form.active} onChange={e => setForm(f=>({...f,active:e.target.checked}))} className="w-4 h-4" />
              <label htmlFor="active" className="text-sm text-gray-300">Ativo</label>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={save} disabled={saving || !form.name}
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
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-800">
              <tr className="text-gray-400 text-xs uppercase tracking-wide">
                <th className="text-left px-6 py-4">Bairro</th>
                <th className="text-left px-4 py-4">Prefixo CEP</th>
                <th className="text-left px-4 py-4">Taxa</th>
                <th className="text-left px-4 py-4">Tempo</th>
                <th className="text-left px-4 py-4">Status</th>
                <th className="px-4 py-4" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id} className={`border-b border-gray-800/50 ${i % 2 === 0 ? '' : 'bg-gray-800/20'}`}>
                  <td className="px-6 py-4 font-medium text-white">{row.name}</td>
                  <td className="px-4 py-4 text-gray-400">{row.cep_prefix ?? '—'}</td>
                  <td className="px-4 py-4 text-white font-semibold">{row.delivery_fee === 0 ? 'Grátis' : `R$ ${row.delivery_fee.toFixed(2)}`}</td>
                  <td className="px-4 py-4 text-gray-300">{row.estimated_minutes} min</td>
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
      )}
    </div>
  );
}

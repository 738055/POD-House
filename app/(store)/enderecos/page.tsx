'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { createClient } from '@/lib/supabase/client';
import type { Address } from '@/lib/supabase/types';
import { ArrowLeft, Plus, MapPin, Pencil, Trash2, Star, Loader2, X, Check } from 'lucide-react';

function maskCep(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

const EMPTY_FORM = {
  label: '',
  cep: '',
  logradouro: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  uf: '',
  is_default: false,
};

export default function EnderecosPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loadingCep, setLoadingCep] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) loadAddresses();
  }, [user]);

  async function loadAddresses() {
    setLoading(true);
    const { data } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user!.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    setAddresses((data as Address[]) ?? []);
    setLoading(false);
  }

  async function lookupCep(cep: string) {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm(prev => ({
          ...prev,
          logradouro: data.logradouro ?? prev.logradouro,
          neighborhood: data.bairro ?? prev.neighborhood,
          city: data.localidade ?? prev.city,
          uf: data.uf ?? prev.uf,
        }));
      }
    } finally {
      setLoadingCep(false);
    }
  }

  function openNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowForm(true);
  }

  function openEdit(addr: Address) {
    setEditingId(addr.id);
    setForm({
      label: addr.label ?? '',
      cep: maskCep(addr.cep),
      logradouro: addr.logradouro,
      number: addr.number,
      complement: addr.complement ?? '',
      neighborhood: addr.neighborhood,
      city: addr.city,
      uf: addr.uf,
      is_default: addr.is_default,
    });
    setError(null);
    setShowForm(true);
  }

  async function save() {
    if (!form.logradouro || !form.number || !form.neighborhood || !form.city || !form.uf || !form.cep) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }
    setSaving(true);
    setError(null);
    const clean = form.cep.replace(/\D/g, '');

    try {
      if (form.is_default) {
        await supabase.from('addresses').update({ is_default: false }).eq('user_id', user!.id);
      }

      if (editingId) {
        await supabase.from('addresses').update({
          label: form.label || null,
          cep: clean,
          logradouro: form.logradouro,
          number: form.number,
          complement: form.complement || null,
          neighborhood: form.neighborhood,
          city: form.city,
          uf: form.uf,
          is_default: form.is_default,
        }).eq('id', editingId);
      } else {
        await supabase.from('addresses').insert({
          user_id: user!.id,
          label: form.label || null,
          cep: clean,
          logradouro: form.logradouro,
          number: form.number,
          complement: form.complement || null,
          neighborhood: form.neighborhood,
          city: form.city,
          uf: form.uf,
          is_default: form.is_default,
        });
      }
      setShowForm(false);
      await loadAddresses();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setDeletingId(id);
    await supabase.from('addresses').delete().eq('id', id);
    setAddresses(prev => prev.filter(a => a.id !== id));
    setDeletingId(null);
  }

  async function setDefault(id: string) {
    await supabase.from('addresses').update({ is_default: false }).eq('user_id', user!.id);
    await supabase.from('addresses').update({ is_default: true }).eq('id', id);
    setAddresses(prev => prev.map(a => ({ ...a, is_default: a.id === id })));
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center gap-3 border-b border-gray-200 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 flex-1">Meus Endereços</h1>
        <button onClick={openNew} className="p-2 rounded-full bg-purple-600 hover:bg-purple-700 transition-colors">
          <Plus size={18} className="text-white" />
        </button>
      </div>

      <div className="px-4 py-4 space-y-3">
        {addresses.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <MapPin size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nenhum endereço salvo</p>
            <p className="text-gray-400 text-sm mt-1">Adicione um endereço para agilizar seus pedidos</p>
            <button onClick={openNew} className="mt-4 bg-purple-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-purple-700 transition-colors text-sm">
              Adicionar endereço
            </button>
          </div>
        ) : (
          addresses.map(addr => (
            <div key={addr.id} className="bg-white rounded-2xl p-4 border border-gray-100">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin size={18} className="text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {addr.label && <span className="text-xs font-bold text-purple-600 uppercase">{addr.label}</span>}
                    {addr.is_default && (
                      <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">Principal</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-800">{addr.logradouro}, {addr.number}{addr.complement ? `, ${addr.complement}` : ''}</p>
                  <p className="text-xs text-gray-500">{addr.neighborhood} — {addr.city}-{addr.uf}</p>
                  <p className="text-xs text-gray-400 font-mono">{maskCep(addr.cep)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                {!addr.is_default && (
                  <button onClick={() => setDefault(addr.id)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-purple-600 transition-colors px-2 py-1 rounded-lg hover:bg-purple-50">
                    <Star size={13} /> Tornar principal
                  </button>
                )}
                <div className="flex-1" />
                <button onClick={() => openEdit(addr)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50">
                  <Pencil size={13} /> Editar
                </button>
                <button onClick={() => remove(addr.id)} disabled={deletingId === addr.id} className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50">
                  {deletingId === addr.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Remover
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 flex-1">{editingId ? 'Editar endereço' : 'Novo endereço'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
              {error && (
                <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-100">{error}</div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Apelido (opcional)</label>
                <input value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
                  placeholder="Ex: Casa, Trabalho" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">CEP *</label>
                <div className="relative">
                  <input value={form.cep}
                    onChange={e => {
                      const masked = maskCep(e.target.value);
                      setForm(p => ({ ...p, cep: masked }));
                      if (masked.replace(/\D/g, '').length === 8) lookupCep(masked);
                    }}
                    placeholder="00000-000" maxLength={9}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 pr-8" />
                  {loadingCep && <Loader2 size={14} className="absolute right-3 top-3 animate-spin text-gray-400" />}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Logradouro *</label>
                <input value={form.logradouro} onChange={e => setForm(p => ({ ...p, logradouro: e.target.value }))}
                  placeholder="Rua, Avenida..." className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Número *</label>
                  <input value={form.number} onChange={e => setForm(p => ({ ...p, number: e.target.value }))}
                    placeholder="123" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Complemento</label>
                  <input value={form.complement} onChange={e => setForm(p => ({ ...p, complement: e.target.value }))}
                    placeholder="Apto, bloco..." className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Bairro *</label>
                <input value={form.neighborhood} onChange={e => setForm(p => ({ ...p, neighborhood: e.target.value }))}
                  placeholder="Bairro" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Cidade *</label>
                  <input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                    placeholder="Cidade" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">UF *</label>
                  <input value={form.uf} onChange={e => setForm(p => ({ ...p, uf: e.target.value.toUpperCase().slice(0, 2) }))}
                    placeholder="PR" maxLength={2} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 uppercase" />
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer py-1">
                <div onClick={() => setForm(p => ({ ...p, is_default: !p.is_default }))}
                  className={`w-10 h-6 rounded-full relative transition-colors ${form.is_default ? 'bg-purple-600' : 'bg-gray-200'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.is_default ? 'left-4' : 'left-0.5'}`} />
                </div>
                <span className="text-sm text-gray-700 font-medium">Definir como endereço principal</span>
              </label>
            </div>

            <div className="px-5 py-4 border-t border-gray-100">
              <button onClick={save} disabled={saving} className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors disabled:bg-purple-400 text-sm">
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                {saving ? 'Salvando...' : 'Salvar endereço'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

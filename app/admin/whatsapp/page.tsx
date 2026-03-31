'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { WhatsappTemplate } from '@/lib/supabase/types';
import { Plus, Pencil, Trash2, Check, X, Loader2, Copy, Eye, Send, MessageCircle } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  order_confirmation: 'Confirmação de Pedido',
  order_status: 'Status do Pedido',
  promotion: 'Promoção',
  welcome: 'Boas-vindas',
  custom: 'Personalizado',
};

const CATEGORY_COLORS: Record<string, string> = {
  order_confirmation: 'bg-green-500/20 text-green-400',
  order_status: 'bg-blue-500/20 text-blue-400',
  promotion: 'bg-amber-500/20 text-amber-400',
  welcome: 'bg-purple-500/20 text-purple-400',
  custom: 'bg-gray-700 text-gray-400',
};

const EMPTY = {
  name: '', slug: '', category: 'custom' as WhatsappTemplate['category'],
  message: '', variables: '' as string, active: true,
};

export default function WhatsappPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<WhatsappTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<WhatsappTemplate | null>(null);
  const [previewVars, setPreviewVars] = useState<Record<string, string>>({});

  async function load() {
    const { data } = await supabase.from('whatsapp_templates').select('*').order('category').order('name');
    if (data) setRows(data as WhatsappTemplate[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(row?: WhatsappTemplate) {
    if (row) {
      setForm({
        name: row.name, slug: row.slug, category: row.category,
        message: row.message, variables: row.variables.join(', '), active: row.active,
      });
      setEditId(row.id);
    } else {
      setForm(EMPTY);
      setEditId('new');
    }
  }

  async function save() {
    setSaving(true);
    const vars = form.variables.split(',').map(v => v.trim()).filter(Boolean);
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      category: form.category,
      message: form.message,
      variables: vars,
      active: form.active,
    };
    if (editId === 'new') await supabase.from('whatsapp_templates').insert(payload);
    else await supabase.from('whatsapp_templates').update(payload).eq('id', editId!);
    setEditId(null);
    await load();
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm('Excluir template?')) return;
    await supabase.from('whatsapp_templates').delete().eq('id', id);
    setRows(r => r.filter(x => x.id !== id));
  }

  function openPreview(row: WhatsappTemplate) {
    setPreview(row);
    const vars: Record<string, string> = {};
    row.variables.forEach(v => {
      // Default example values
      const examples: Record<string, string> = {
        nome: 'João Silva', pedido_id: 'abc12345', total: '89,90',
        endereco: 'Rua das Flores, 123 - Centro', tempo_estimado: '30-45 min',
        itens: '2x Pod Watermelon\n1x Pod Grape Ice', titulo: 'MEGA PROMOÇÃO',
        descricao: 'Todos os pods com 20% OFF!', cupom: 'PROMO20',
      };
      vars[v] = examples[v] || `{${v}}`;
    });
    setPreviewVars(vars);
  }

  function renderPreviewMessage(template: WhatsappTemplate, vars: Record<string, string>) {
    let msg = template.message;
    Object.entries(vars).forEach(([key, value]) => {
      msg = msg.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });
    return msg;
  }

  function generateWhatsAppLink(phone: string, message: string) {
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${phone}?text=${encoded}`;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageCircle size={24} className="text-green-400" /> Templates WhatsApp
          </h1>
          <p className="text-gray-400 text-sm mt-1">Gerencie templates de mensagens para envio via WhatsApp</p>
        </div>
        <button onClick={() => startEdit()} className="flex items-center gap-2 bg-green-600 text-white font-semibold px-4 py-2 rounded-xl text-sm hover:bg-green-700">
          <Plus size={16} /> Novo Template
        </button>
      </div>

      {/* Edit Form */}
      {editId && (
        <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
          <h2 className="text-lg font-bold mb-4">{editId === 'new' ? 'Novo Template' : 'Editar Template'}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Nome *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Confirmação de Pedido"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Slug (identificador) *</label>
              <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
                placeholder="Ex: order_confirmation"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-gray-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Categoria *</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as WhatsappTemplate['category'] }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500">
                {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">
                Variáveis <span className="text-gray-500">(separadas por vírgula)</span>
              </label>
              <input value={form.variables} onChange={e => setForm(f => ({ ...f, variables: e.target.value }))}
                placeholder="nome, pedido_id, total"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">
                Mensagem * <span className="text-gray-500">(use {'{{variavel}}'} para inserir variáveis)</span>
              </label>
              <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                rows={8} placeholder={'Olá {{nome}}! Seu pedido #{{pedido_id}} foi confirmado.'}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500 font-mono" />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="tactive" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4" />
              <label htmlFor="tactive" className="text-sm text-gray-300">Ativo</label>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={save} disabled={saving || !form.name || !form.slug || !form.message}
              className="flex items-center gap-2 bg-green-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm disabled:opacity-40 hover:bg-green-700">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Salvar
            </button>
            <button onClick={() => setEditId(null)} className="flex items-center gap-2 border border-gray-700 text-gray-300 px-5 py-2.5 rounded-xl text-sm">
              <X size={16} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Templates List */}
      {loading ? (
        <div className="text-gray-400 py-12 text-center">Carregando...</div>
      ) : (
        <div className="space-y-3">
          {rows.map(row => (
            <div key={row.id} className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-white">{row.name}</h3>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[row.category]}`}>
                      {CATEGORY_LABELS[row.category]}
                    </span>
                    {!row.active && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Inativo</span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs font-mono mb-2">slug: {row.slug}</p>
                  <p className="text-gray-400 text-sm whitespace-pre-line line-clamp-3">{row.message}</p>
                  {row.variables.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {row.variables.map(v => (
                        <span key={v} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded font-mono">{`{{${v}}}`}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                  <button onClick={() => openPreview(row)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg" title="Pré-visualizar">
                    <Eye size={16} />
                  </button>
                  <button onClick={() => startEdit(row)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg" title="Editar">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => remove(row.id)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg" title="Excluir">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {rows.length === 0 && (
            <div className="text-gray-500 text-center py-12">Nenhum template criado ainda.</div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setPreview(null)} />
          <div className="relative bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageCircle size={18} className="text-green-400" /> Pré-visualização
              </h2>
              <button onClick={() => setPreview(null)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Variable inputs */}
              {preview.variables.length > 0 && (
                <div>
                  <h4 className="text-xs text-gray-400 uppercase tracking-wide mb-2">Variáveis</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {preview.variables.map(v => (
                      <div key={v}>
                        <label className="text-xs text-gray-500 mb-0.5 block">{v}</label>
                        <input
                          value={previewVars[v] || ''} onChange={e => setPreviewVars(p => ({ ...p, [v]: e.target.value }))}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-gray-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* WhatsApp-style preview */}
              <div className="bg-[#0B141A] rounded-xl p-4">
                <div className="bg-[#005C4B] rounded-lg p-3 ml-8">
                  <p className="text-white text-sm whitespace-pre-line leading-relaxed">
                    {renderPreviewMessage(preview, previewVars)}
                  </p>
                  <p className="text-right text-[10px] text-green-200/60 mt-1">
                    {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Copy / Send buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => navigator.clipboard.writeText(renderPreviewMessage(preview, previewVars))}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-800 text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-700"
                >
                  <Copy size={14} /> Copiar Texto
                </button>
                <button
                  onClick={() => {
                    const phone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || '';
                    const msg = renderPreviewMessage(preview, previewVars);
                    window.open(generateWhatsAppLink(phone, msg), '_blank');
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-green-700"
                >
                  <Send size={14} /> Testar no WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

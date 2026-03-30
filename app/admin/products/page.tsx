'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Product, Category, ProductVariant } from '@/lib/supabase/types';
import { Plus, Pencil, Trash2, Check, X, Loader2, ChevronDown, ChevronUp, ImageIcon } from 'lucide-react';

export default function ProductsPage() {
  const supabase = createClient();
  const [products,   setProducts]   = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [editId,     setEditId]     = useState<string | 'new' | null>(null);
  const [expanded,   setExpanded]   = useState<string | null>(null);
  const [saving,     setSaving]     = useState(false);

  const EMPTY_PROD = { name: '', description: '', base_price: 0, puffs: '', category_id: '', is_featured: false, active: true };
  const [form, setForm] = useState(EMPTY_PROD);

  const EMPTY_VAR = { name: '', image_url: '', price_override: '' as string | number, stock: 0, active: true, sort_order: 0 };
  const [editVariantId,     setEditVariantId]     = useState<string | 'new' | null>(null);
  const [editingProductId,  setEditingProductId]  = useState<string | null>(null);
  const [varForm, setVarForm] = useState(EMPTY_VAR);

  async function load() {
    const [prods, cats] = await Promise.all([
      supabase.from('products').select('*, product_variants(*), categories(name)').order('sort_order'),
      supabase.from('categories').select('id,name').eq('active', true).order('name'),
    ]);
    if (prods.data) setProducts(prods.data as Product[]);
    if (cats.data)  setCategories(cats.data as Category[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEditProduct(row?: Product) {
    if (row) {
      setForm({ name: row.name, description: row.description ?? '', base_price: row.base_price,
        puffs: row.puffs ?? '', category_id: row.category_id ?? '', is_featured: row.is_featured, active: row.active });
      setEditId(row.id);
    } else { setForm(EMPTY_PROD); setEditId('new'); }
  }

  async function saveProduct() {
    setSaving(true);
    const payload = { name: form.name.trim(), description: form.description || null, base_price: Number(form.base_price),
      puffs: form.puffs || null, category_id: form.category_id || null, is_featured: form.is_featured, active: form.active };
    if (editId === 'new') await supabase.from('products').insert(payload);
    else await supabase.from('products').update(payload).eq('id', editId!);
    setEditId(null); await load(); setSaving(false);
  }

  async function deleteProduct(id: string) {
    if (!confirm('Excluir produto e todas as suas variações?')) return;
    await supabase.from('products').delete().eq('id', id);
    setProducts(p => p.filter(x => x.id !== id));
  }

  function startEditVariant(productId: string, variant?: ProductVariant) {
    setEditingProductId(productId);
    if (variant) {
      setVarForm({ name: variant.name, image_url: variant.image_url ?? '', price_override: variant.price_override ?? '',
        stock: variant.stock, active: variant.active, sort_order: variant.sort_order });
      setEditVariantId(variant.id);
    } else { setVarForm(EMPTY_VAR); setEditVariantId('new'); }
  }

  async function saveVariant() {
    setSaving(true);
    const payload = { product_id: editingProductId!, name: varForm.name.trim(), image_url: varForm.image_url || null,
      price_override: varForm.price_override !== '' ? Number(varForm.price_override) : null,
      stock: Number(varForm.stock), active: varForm.active, sort_order: Number(varForm.sort_order) };
    if (editVariantId === 'new') await supabase.from('product_variants').insert(payload);
    else await supabase.from('product_variants').update(payload).eq('id', editVariantId!);
    setEditVariantId(null); setEditingProductId(null); await load(); setSaving(false);
  }

  async function deleteVariant(id: string) {
    if (!confirm('Excluir variação?')) return;
    await supabase.from('product_variants').delete().eq('id', id);
    await load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Produtos</h1>
          <p className="text-gray-400 text-sm mt-1">Gerencie produtos e seus sabores/variações</p>
        </div>
        <button onClick={() => startEditProduct()} className="flex items-center gap-2 bg-white text-black font-semibold px-4 py-2 rounded-xl text-sm">
          <Plus size={16} /> Novo Produto
        </button>
      </div>

      {editId && (
        <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
          <h2 className="text-lg font-bold mb-4">{editId === 'new' ? 'Novo Produto' : 'Editar Produto'}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Nome *</label>
              <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Ex: IGNITE V15 1.500MIL PUFFS"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Preço Base (R$)</label>
              <input type="number" step="0.10" min="0" value={form.base_price} onChange={e => setForm(f=>({...f,base_price:parseFloat(e.target.value)}))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Puffs</label>
              <input value={form.puffs} onChange={e => setForm(f=>({...f,puffs:e.target.value}))} placeholder="Ex: 1.500 PUFFS"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Categoria</label>
              <select value={form.category_id} onChange={e => setForm(f=>({...f,category_id:e.target.value}))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500">
                <option value="">Sem categoria</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Descrição</label>
              <input value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500" />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" checked={form.is_featured} onChange={e => setForm(f=>({...f,is_featured:e.target.checked}))} className="w-4 h-4" />
                Destaque
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={e => setForm(f=>({...f,active:e.target.checked}))} className="w-4 h-4" />
                Ativo
              </label>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={saveProduct} disabled={saving || !form.name}
              className="flex items-center gap-2 bg-white text-black font-semibold px-5 py-2.5 rounded-xl text-sm disabled:opacity-40">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Salvar
            </button>
            <button onClick={() => setEditId(null)} className="flex items-center gap-2 border border-gray-700 text-gray-300 px-5 py-2.5 rounded-xl text-sm">
              <X size={16} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {editVariantId && (
        <div className="bg-blue-950 rounded-2xl p-6 mb-6 border border-blue-800">
          <h2 className="text-lg font-bold mb-4 text-blue-200">{editVariantId === 'new' ? 'Nova Variação/Sabor' : 'Editar Variação'}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-blue-300 uppercase tracking-wide mb-1 block">Nome do Sabor *</label>
              <input value={varForm.name} onChange={e => setVarForm(f=>({...f,name:e.target.value}))} placeholder="Ex: Ice Mango"
                className="w-full bg-blue-900/50 border border-blue-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-blue-300 uppercase tracking-wide mb-1 block">Preço Específico (vazio = base)</label>
              <input type="number" step="0.10" min="0" value={varForm.price_override}
                onChange={e => setVarForm(f=>({...f,price_override:e.target.value}))} placeholder="Deixe vazio p/ usar preço base"
                className="w-full bg-blue-900/50 border border-blue-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-blue-300 uppercase tracking-wide mb-1 block">URL da Imagem do Sabor</label>
              <input value={varForm.image_url} onChange={e => setVarForm(f=>({...f,image_url:e.target.value}))}
                placeholder="https://... (URL da foto desse sabor específico)"
                className="w-full bg-blue-900/50 border border-blue-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-blue-300 uppercase tracking-wide mb-1 block">Estoque</label>
              <input type="number" min="0" value={varForm.stock} onChange={e => setVarForm(f=>({...f,stock:parseInt(e.target.value)}))}
                className="w-full bg-blue-900/50 border border-blue-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-blue-300 uppercase tracking-wide mb-1 block">Ordem de exibição</label>
              <input type="number" min="0" value={varForm.sort_order} onChange={e => setVarForm(f=>({...f,sort_order:parseInt(e.target.value)}))}
                className="w-full bg-blue-900/50 border border-blue-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="vactive" checked={varForm.active} onChange={e => setVarForm(f=>({...f,active:e.target.checked}))} className="w-4 h-4" />
              <label htmlFor="vactive" className="text-sm text-blue-200">Ativo</label>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={saveVariant} disabled={saving || !varForm.name}
              className="flex items-center gap-2 bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm disabled:opacity-40">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Salvar Sabor
            </button>
            <button onClick={() => { setEditVariantId(null); setEditingProductId(null); }}
              className="flex items-center gap-2 border border-blue-700 text-blue-200 px-5 py-2.5 rounded-xl text-sm">
              <X size={16} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 py-12 text-center">Carregando...</div>
      ) : (
        <div className="space-y-3">
          {products.map(product => (
            <div key={product.id} className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="w-12 h-12 bg-gray-800 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {product.product_variants?.[0]?.image_url
                    ? <img src={product.product_variants[0].image_url} alt="" className="w-full h-full object-contain p-1" />
                    : <ImageIcon size={20} className="text-gray-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm uppercase truncate">{product.name}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="text-green-400 text-xs font-semibold">R$ {product.base_price.toFixed(2)}</span>
                    {product.puffs && <span className="text-gray-500 text-xs">{product.puffs}</span>}
                    <span className="text-gray-600 text-xs">{product.product_variants?.length ?? 0} sabores</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${product.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                      {product.active ? 'Ativo' : 'Inativo'}
                    </span>
                    {product.is_featured && <span className="text-xs px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">⭐ Destaque</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => startEditVariant(product.id)}
                    className="text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1">
                    <Plus size={12} /> Sabor
                  </button>
                  <button onClick={() => startEditProduct(product)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"><Pencil size={14} /></button>
                  <button onClick={() => deleteProduct(product.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 size={14} /></button>
                  <button onClick={() => setExpanded(expanded === product.id ? null : product.id)}
                    className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg">
                    {expanded === product.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {expanded === product.id && (
                <div className="border-t border-gray-800 px-5 pb-4 pt-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Sabores / Variações ({product.product_variants?.length ?? 0})</p>
                  {(!product.product_variants || product.product_variants.length === 0) ? (
                    <p className="text-gray-600 text-sm italic py-2">Nenhuma variação. Clique em "+ Sabor" para adicionar.</p>
                  ) : (
                    <div className="space-y-2">
                      {[...(product.product_variants ?? [])].sort((a,b)=>a.sort_order-b.sort_order).map(v => (
                        <div key={v.id} className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3">
                          <div className="w-10 h-10 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {v.image_url
                              ? <img src={v.image_url} alt={v.name} className="w-full h-full object-contain p-0.5" />
                              : <ImageIcon size={16} className="text-gray-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white">{v.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-green-400 text-xs">{v.price_override ? `R$ ${v.price_override.toFixed(2)}` : 'Preço base'}</span>
                              <span className="text-gray-500 text-xs">Estoque: {v.stock}</span>
                              {!v.active && <span className="text-xs text-red-400">Inativo</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => startEditVariant(product.id, v)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"><Pencil size={13} /></button>
                            <button onClick={() => deleteVariant(v.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 size={13} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

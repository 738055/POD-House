'use client';

import { useAuth } from '@/hooks/use-auth';
import { useState, useEffect } from 'react';
import { Plus, Pencil, Loader2, AlertCircle, Search, Filter, ArrowUpDown, Package, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ConfirmModal } from '../components/ConfirmModal';
import { StatusToggle } from '../components/StatusToggle';

type ProductForAdminList = {
  id: string;
  name: string;
  base_price: number;
  active: boolean;
  is_featured: boolean;
  categories: { name: string } | null;
  product_variants: { image_url: string | null }[];
};

const PAGE_SIZE = 20;

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function AdminProductsPage() {
  const { supabase } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<ProductForAdminList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  async function fetchProducts(p = 0) {
    if (!supabase) return;
    setLoading(true);
    setError(null);

    const from = p * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error, count } = await supabase
      .from('products')
      .select(`id, name, base_price, active, is_featured, categories(name), product_variants(image_url)`, { count: 'exact' })
      .order('name', { ascending: true })
      .range(from, to);

    if (error) setError('Não foi possível carregar os produtos.');
    else {
      setProducts(data as ProductForAdminList[]);
      setTotalCount(count ?? 0);
    }
    setLoading(false);
  }

  useEffect(() => { fetchProducts(page); }, [supabase, page]);

  async function deleteProduct(id: string) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      toast('Erro ao excluir produto.', 'error');
    } else {
      toast('Produto excluído.');
      setProducts(prev => prev.filter(p => p.id !== id));
      setTotalCount(c => c - 1);
    }
    setConfirmId(null);
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.categories?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-600/10 rounded-2xl"><Package className="text-purple-500" size={28} /></div>
            <h1 className="text-4xl font-black text-white tracking-tight">Produtos</h1>
          </div>
          <p className="text-gray-400 font-medium ml-1">{totalCount} produtos cadastrados</p>
        </div>
        <Link href="/admin/products/new">
          <Button size="lg" leftIcon={<Plus size={20} />} className="w-full md:w-auto">Novo Produto</Button>
        </Link>
      </div>

      <Card variant="outline" padding="sm" className="bg-gray-900/40 backdrop-blur-sm border-gray-800/50">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow">
            <Input placeholder="Buscar por nome ou categoria..." leftIcon={<Search size={18} />}
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-gray-900/60 border-gray-800/50" />
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-24 space-y-4">
          <div className="w-16 h-16 border-4 border-purple-600/20 border-t-purple-600 rounded-full animate-spin" />
          <p className="text-gray-500 font-bold animate-pulse">Carregando catálogo...</p>
        </div>
      ) : error ? (
        <Card variant="outline" className="border-red-500/20 bg-red-500/5 p-12 text-center">
          <AlertCircle className="text-red-500 mx-auto mb-4" size={32} />
          <p className="text-red-400/80">{error}</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card variant="outline" className="border-gray-800 bg-gray-900/20 p-20 text-center">
          <Search className="text-gray-600 mx-auto mb-4" size={40} />
          <h3 className="text-2xl font-bold text-white mb-2">Nenhum produto encontrado</h3>
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block">
            <Card padding="none" className="border-gray-800/50 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-800/30 border-b border-gray-800/50">
                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-gray-500">Produto</th>
                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-gray-500">Categoria</th>
                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-gray-500">Preço Base</th>
                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-gray-500">Ativo</th>
                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-gray-500 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {filtered.map(product => (
                    <tr key={product.id} className="group hover:bg-purple-600/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative w-12 h-12 rounded-xl bg-gray-800 overflow-hidden border border-gray-700/50 shrink-0">
                            <Image src={product.product_variants[0]?.image_url || '/logo.png'} alt={product.name} fill className="object-contain p-1.5" unoptimized />
                          </div>
                          <div>
                            <p className="font-black text-white group-hover:text-purple-400 transition-colors">{product.name}</p>
                            {product.is_featured && <span className="text-[10px] font-black uppercase text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded">Destaque</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-gray-800 text-gray-300 rounded-lg text-xs font-bold border border-gray-700/50">
                          {product.categories?.name || 'Sem Categoria'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-black text-white">{formatCurrency(product.base_price)}</td>
                      <td className="px-6 py-4">
                        <StatusToggle id={product.id} table="products" active={product.active}
                          onToggle={v => setProducts(prev => prev.map(p => p.id === product.id ? { ...p, active: v } : p))} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/products/${product.id}`}>
                            <Button variant="ghost" size="icon" className="hover:bg-purple-600/20 hover:text-purple-400"><Pencil size={17} /></Button>
                          </Link>
                          <Button variant="ghost" size="icon" className="hover:bg-red-600/20 hover:text-red-400" onClick={() => setConfirmId(product.id)}>
                            <Trash2 size={17} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(product => (
              <Card key={product.id} padding="none" className="group hover:border-purple-500/30 transition-all duration-300">
                <div className="p-5 flex items-start gap-4">
                  <div className="relative w-20 h-20 rounded-2xl bg-gray-800 overflow-hidden border border-gray-700/50 shrink-0">
                    <Image src={product.product_variants[0]?.image_url || '/logo.png'} alt={product.name} fill className="object-contain p-2" unoptimized />
                  </div>
                  <div className="flex-grow min-w-0">
                    <h3 className="font-black text-white text-lg leading-tight truncate">{product.name}</h3>
                    <p className="text-sm text-gray-500 font-bold mb-1">{product.categories?.name || 'Sem Categoria'}</p>
                    <p className="text-xl font-black text-purple-500">{formatCurrency(product.base_price)}</p>
                  </div>
                </div>
                <div className="px-5 py-4 bg-gray-800/30 border-t border-gray-800/50 flex items-center justify-between">
                  <StatusToggle id={product.id} table="products" active={product.active}
                    onToggle={v => setProducts(prev => prev.map(p => p.id === product.id ? { ...p, active: v } : p))} />
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/products/${product.id}`}>
                      <Button variant="secondary" size="sm" leftIcon={<Pencil size={14} />}>Editar</Button>
                    </Link>
                    <Button variant="ghost" size="icon" className="hover:bg-red-600/20 hover:text-red-400 text-gray-500" onClick={() => setConfirmId(product.id)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-gray-500">
                Página {page + 1} de {totalPages} · {totalCount} produtos
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 0}
                  className="px-4 py-2 text-sm font-semibold text-gray-300 bg-gray-800 rounded-xl disabled:opacity-40 hover:bg-gray-700 transition-colors"
                >
                  ← Anterior
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages - 1}
                  className="px-4 py-2 text-sm font-semibold text-gray-300 bg-gray-800 rounded-xl disabled:opacity-40 hover:bg-gray-700 transition-colors"
                >
                  Próxima →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmModal
        open={!!confirmId}
        title="Excluir produto?"
        description="Todas as variações também serão excluídas. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={() => deleteProduct(confirmId!)}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}

'use client';

import { useAuth } from '@/hooks/use-auth';
import { useState, useEffect } from 'react';
import {
  Plus, Pencil, Search, Package, Trash2, Eye, EyeOff,
  Star, Box, TrendingUp, ChevronLeft, ChevronRight, Wind,
  LayoutGrid, List, MoreVertical
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { cn, formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ConfirmModal } from '../components/ConfirmModal';
import { StatusToggle } from '../components/StatusToggle';

type ProductForAdminList = {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  puffs: string | null;
  active: boolean;
  is_featured: boolean;
  categories: { name: string } | null;
  product_variants: { id: string; name: string; image_url: string | null; stock: number; price_override: number | null; active: boolean }[];
};

const PAGE_SIZE = 20;


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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  async function fetchProducts(p = 0) {
    if (!supabase) return;
    setLoading(true);
    setError(null);

    const from = p * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error, count } = await supabase
      .from('products')
      .select(`id, name, description, base_price, puffs, active, is_featured, categories(name), product_variants(id, name, image_url, stock, price_override, active)`, { count: 'exact' })
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
      toast('Produto excluído com sucesso.', 'success');
      setProducts(prev => prev.filter(p => p.id !== id));
      setTotalCount(c => c - 1);
    }
    setConfirmId(null);
  }

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.categories?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.product_variants.some(v => v.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStatus = filterStatus === 'all' ? true : filterStatus === 'active' ? p.active : !p.active;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const stats = {
    total: totalCount,
    active: products.filter(p => p.active).length,
    featured: products.filter(p => p.is_featured).length,
    totalVariants: products.reduce((acc, p) => acc + p.product_variants.length, 0),
  };

  function getTotalStock(product: ProductForAdminList) {
    return product.product_variants.reduce((acc, v) => acc + v.stock, 0);
  }

  function getStockColor(stock: number) {
    if (stock === 0) return 'text-red-400 bg-red-500/10';
    if (stock <= 5) return 'text-amber-400 bg-amber-500/10';
    return 'text-emerald-400 bg-emerald-500/10';
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-2xl border border-purple-500/10">
              <Package className="text-purple-400" size={28} />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight">Catálogo de PODs</h1>
              <p className="text-gray-500 font-medium text-sm">Gerencie seus produtos e sabores</p>
            </div>
          </div>
        </div>
        <Link href="/admin/products/new">
          <Button size="lg" leftIcon={<Plus size={20} />} className="w-full lg:w-auto">
            Novo Produto
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: Package, color: 'purple' },
          { label: 'Ativos', value: stats.active, icon: Eye, color: 'emerald' },
          { label: 'Destaques', value: stats.featured, icon: Star, color: 'amber' },
          { label: 'Sabores', value: stats.totalVariants, icon: Wind, color: 'blue' },
        ].map(stat => (
          <div key={stat.label} className="bg-gray-900/60 border border-gray-800/50 rounded-xl p-4 flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              stat.color === 'purple' && 'bg-purple-500/10 text-purple-400',
              stat.color === 'emerald' && 'bg-emerald-500/10 text-emerald-400',
              stat.color === 'amber' && 'bg-amber-500/10 text-amber-400',
              stat.color === 'blue' && 'bg-blue-500/10 text-blue-400',
            )}>
              <stat.icon size={18} />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{stat.value}</p>
              <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <Card variant="outline" padding="sm" className="bg-gray-900/40 backdrop-blur-sm border-gray-800/50">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="flex-grow">
            <Input
              placeholder="Buscar produto, categoria ou sabor..."
              leftIcon={<Search size={18} />}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-gray-900/60 border-gray-800/50"
            />
          </div>
          <div className="flex items-center gap-2">
            {/* Status filter */}
            <div className="flex bg-gray-800/50 rounded-xl p-0.5 border border-gray-700/30">
              {(['all', 'active', 'inactive'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-bold rounded-lg transition-all',
                    filterStatus === status
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  )}
                >
                  {status === 'all' ? 'Todos' : status === 'active' ? 'Ativos' : 'Inativos'}
                </button>
              ))}
            </div>
            {/* View mode */}
            <div className="hidden md:flex bg-gray-800/50 rounded-xl p-0.5 border border-gray-700/30">
              <button
                onClick={() => setViewMode('grid')}
                className={cn('p-1.5 rounded-lg transition-all', viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white')}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn('p-1.5 rounded-lg transition-all', viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white')}
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-24 space-y-4">
          <div className="w-16 h-16 border-4 border-purple-600/20 border-t-purple-600 rounded-full animate-spin" />
          <p className="text-gray-500 font-bold animate-pulse">Carregando catálogo...</p>
        </div>
      ) : error ? (
        <Card variant="outline" className="border-red-500/20 bg-red-500/5 p-12 text-center">
          <p className="text-red-400/80">{error}</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card variant="outline" className="border-gray-800 bg-gray-900/20 p-20 text-center">
          <Package className="text-gray-700 mx-auto mb-4" size={48} />
          <h3 className="text-xl font-bold text-white mb-2">Nenhum produto encontrado</h3>
          <p className="text-gray-500 text-sm mb-6">Tente ajustar os filtros ou crie um novo produto.</p>
          <Link href="/admin/products/new">
            <Button leftIcon={<Plus size={18} />}>Criar Primeiro Produto</Button>
          </Link>
        </Card>
      ) : (
        <>
          {/* Grid View */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(product => {
                const totalStock = getTotalStock(product);
                const mainImage = product.product_variants[0]?.image_url;
                const variantCount = product.product_variants.length;

                return (
                  <Card
                    key={product.id}
                    padding="none"
                    className={cn(
                      'group hover:border-purple-500/30 transition-all duration-300 overflow-hidden',
                      !product.active && 'opacity-60'
                    )}
                  >
                    {/* Product Image & Badges */}
                    <div className="relative bg-gradient-to-br from-gray-800/80 to-gray-900 aspect-[4/3] overflow-hidden">
                      {mainImage ? (
                        <Image
                          src={mainImage}
                          alt={product.name}
                          fill
                          className="object-contain p-6 group-hover:scale-105 transition-transform duration-500"
                          unoptimized
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Package className="text-gray-700" size={64} />
                        </div>
                      )}

                      {/* Badges */}
                      <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                        {product.is_featured && (
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase bg-amber-500/90 text-black px-2 py-1 rounded-lg backdrop-blur-sm">
                            <Star size={10} className="fill-current" /> Destaque
                          </span>
                        )}
                        {!product.active && (
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase bg-gray-800/90 text-gray-400 px-2 py-1 rounded-lg backdrop-blur-sm">
                            <EyeOff size={10} /> Inativo
                          </span>
                        )}
                      </div>

                      {/* Puffs badge */}
                      {product.puffs && (
                        <div className="absolute top-3 right-3">
                          <span className="flex items-center gap-1 text-[10px] font-black bg-purple-600/90 text-white px-2 py-1 rounded-lg backdrop-blur-sm">
                            <Wind size={10} /> {product.puffs} puffs
                          </span>
                        </div>
                      )}

                      {/* Variant thumbnails */}
                      {variantCount > 1 && (
                        <div className="absolute bottom-3 left-3 right-3">
                          <div className="flex items-center gap-1.5">
                            {product.product_variants.slice(0, 5).map(v => (
                              <div
                                key={v.id}
                                className="w-8 h-8 rounded-lg bg-gray-800/90 border border-gray-700/50 overflow-hidden backdrop-blur-sm shrink-0"
                                title={v.name}
                              >
                                {v.image_url ? (
                                  <Image src={v.image_url} alt={v.name} width={32} height={32} className="object-contain p-0.5" unoptimized />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-gray-500">
                                    {v.name.charAt(0)}
                                  </div>
                                )}
                              </div>
                            ))}
                            {variantCount > 5 && (
                              <span className="text-[10px] font-bold text-gray-400 bg-gray-800/90 px-2 py-1 rounded-lg backdrop-blur-sm">
                                +{variantCount - 5}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-4 space-y-3">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-black text-white text-lg leading-tight truncate group-hover:text-purple-400 transition-colors">
                              {product.name}
                            </h3>
                            <p className="text-xs text-gray-500 font-semibold mt-0.5">
                              {product.categories?.name || 'Sem Categoria'}
                            </p>
                          </div>
                          <p className="text-xl font-black text-purple-400 shrink-0">
                            {formatCurrency(product.base_price)}
                          </p>
                        </div>
                      </div>

                      {/* Variant & Stock info */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1 text-[11px] font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg">
                          <Wind size={11} /> {variantCount} {variantCount === 1 ? 'sabor' : 'sabores'}
                        </span>
                        <span className={cn('flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg', getStockColor(totalStock))}>
                          <Box size={11} /> {totalStock} em estoque
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="px-4 py-3 bg-gray-800/20 border-t border-gray-800/50 flex items-center justify-between">
                      <StatusToggle
                        id={product.id}
                        table="products"
                        active={product.active}
                        onToggle={v => setProducts(prev => prev.map(p => p.id === product.id ? { ...p, active: v } : p))}
                      />
                      <div className="flex items-center gap-1">
                        <Link href={`/admin/products/${product.id}`}>
                          <Button variant="ghost" size="sm" leftIcon={<Pencil size={14} />} className="hover:bg-purple-600/20 hover:text-purple-400">
                            Editar
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-red-600/20 hover:text-red-400 text-gray-500"
                          onClick={() => setConfirmId(product.id)}
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="hidden md:block">
              <Card padding="none" className="border-gray-800/50 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-800/30 border-b border-gray-800/50">
                      <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Produto</th>
                      <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Categoria</th>
                      <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Sabores</th>
                      <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Estoque</th>
                      <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Preço</th>
                      <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Status</th>
                      <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/40">
                    {filtered.map(product => {
                      const totalStock = getTotalStock(product);
                      return (
                        <tr key={product.id} className={cn('group hover:bg-purple-600/5 transition-colors', !product.active && 'opacity-60')}>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="relative w-11 h-11 rounded-xl bg-gray-800 overflow-hidden border border-gray-700/50 shrink-0">
                                <Image
                                  src={product.product_variants[0]?.image_url || '/logo.png'}
                                  alt={product.name}
                                  fill
                                  className="object-contain p-1"
                                  unoptimized
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-white text-sm truncate group-hover:text-purple-400 transition-colors">
                                  {product.name}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {product.is_featured && (
                                    <Star size={10} className="text-amber-400 fill-amber-400" />
                                  )}
                                  {product.puffs && (
                                    <span className="text-[10px] text-gray-500">{product.puffs} puffs</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="px-2.5 py-1 bg-gray-800 text-gray-400 rounded-lg text-[11px] font-bold border border-gray-700/40">
                              {product.categories?.name || 'Sem Categoria'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-1">
                              {product.product_variants.slice(0, 3).map(v => (
                                <div key={v.id} className="w-6 h-6 rounded-md bg-gray-800 border border-gray-700/50 overflow-hidden" title={v.name}>
                                  {v.image_url ? (
                                    <Image src={v.image_url} alt={v.name} width={24} height={24} className="object-contain" unoptimized />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[7px] font-bold text-gray-600">{v.name.charAt(0)}</div>
                                  )}
                                </div>
                              ))}
                              <span className="text-[11px] font-bold text-gray-500 ml-1">
                                {product.product_variants.length}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={cn('text-xs font-bold px-2 py-0.5 rounded-md', getStockColor(totalStock))}>
                              {totalStock}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-black text-white text-sm">{formatCurrency(product.base_price)}</td>
                          <td className="px-5 py-3.5">
                            <StatusToggle
                              id={product.id}
                              table="products"
                              active={product.active}
                              onToggle={v => setProducts(prev => prev.map(p => p.id === product.id ? { ...p, active: v } : p))}
                            />
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link href={`/admin/products/${product.id}`}>
                                <Button variant="ghost" size="icon" className="hover:bg-purple-600/20 hover:text-purple-400"><Pencil size={15} /></Button>
                              </Link>
                              <Button variant="ghost" size="icon" className="hover:bg-red-600/20 hover:text-red-400" onClick={() => setConfirmId(product.id)}>
                                <Trash2 size={15} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {/* Mobile fallback for list view */}
          {viewMode === 'list' && (
            <div className="md:hidden grid grid-cols-1 gap-3">
              {filtered.map(product => {
                const totalStock = getTotalStock(product);
                return (
                  <Card key={product.id} padding="none" className={cn('group', !product.active && 'opacity-60')}>
                    <div className="p-4 flex items-center gap-3">
                      <div className="relative w-14 h-14 rounded-xl bg-gray-800 overflow-hidden border border-gray-700/50 shrink-0">
                        <Image src={product.product_variants[0]?.image_url || '/logo.png'} alt={product.name} fill className="object-contain p-1.5" unoptimized />
                      </div>
                      <div className="flex-grow min-w-0">
                        <h3 className="font-bold text-white text-sm truncate">{product.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-black text-purple-400">{formatCurrency(product.base_price)}</span>
                          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', getStockColor(totalStock))}>{totalStock} un</span>
                          <span className="text-[10px] text-gray-500">{product.product_variants.length} sabores</span>
                        </div>
                      </div>
                      <Link href={`/admin/products/${product.id}`}>
                        <Button variant="ghost" size="icon"><Pencil size={16} /></Button>
                      </Link>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-gray-500 font-medium">
                Página <span className="text-white font-bold">{page + 1}</span> de {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 0}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-semibold text-gray-300 bg-gray-800 rounded-xl disabled:opacity-30 hover:bg-gray-700 transition-colors"
                >
                  <ChevronLeft size={16} /> Anterior
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages - 1}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-semibold text-gray-300 bg-gray-800 rounded-xl disabled:opacity-30 hover:bg-gray-700 transition-colors"
                >
                  Próxima <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmModal
        open={!!confirmId}
        title="Excluir produto?"
        description="Todas as variações (sabores) também serão excluídas permanentemente. Esta ação não pode ser desfeita."
        confirmLabel="Excluir Produto"
        onConfirm={() => deleteProduct(confirmId!)}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}

'use client';

import { useAuth } from '@/hooks/use-auth';
import { useState, useEffect } from 'react';
import { Plus, Pencil, Loader2, AlertCircle, Tag, Search, Trash2, ArrowUpDown, List } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { cn } from '@/lib/utils';

type Category = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  image_url: string | null;
};

export default function AdminCategoriesPage() {
  const { supabase } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchCategories() {
      if (!supabase) return;
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, active, image_url')
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Erro ao buscar categorias:', error);
        setError('Não foi possível carregar as categorias.');
      } else {
        setCategories(data as Category[]);
      }
      setLoading(false);
    }

    fetchCategories();
  }, [supabase]);

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-600/10 rounded-2xl">
              <List className="text-purple-500" size={28} />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">Categorias</h1>
          </div>
          <p className="text-gray-400 font-medium ml-1">Organize seus produtos em categorias lógicas.</p>
        </div>
        
        <Link href="/admin/categories/new">
          <Button size="lg" leftIcon={<Plus size={20} />} className="w-full md:w-auto">
            Nova Categoria
          </Button>
        </Link>
      </div>

      {/* Filters & Search */}
      <Card variant="outline" padding="sm" className="bg-gray-900/40 backdrop-blur-sm border-gray-800/50">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow">
            <Input 
              placeholder="Buscar por nome ou slug..." 
              leftIcon={<Search size={18} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-900/60 border-gray-800/50"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" leftIcon={<ArrowUpDown size={18} />} className="flex-1 md:flex-none">
              Ordenar
            </Button>
          </div>
        </div>
      </Card>

      {/* Content Section */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-24 space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-600/20 border-t-purple-600 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Tag className="text-purple-600 animate-pulse" size={24} />
            </div>
          </div>
          <p className="text-gray-500 font-bold animate-pulse">Carregando categorias...</p>
        </div>
      ) : error ? (
        <Card variant="outline" className="border-red-500/20 bg-red-500/5 p-12 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-red-500" size={32} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Ops! Algo deu errado</h3>
          <p className="text-red-400/80 mb-6">{error}</p>
          <Button variant="danger" onClick={() => window.location.reload()}>Tentar Novamente</Button>
        </Card>
      ) : filteredCategories.length === 0 ? (
        <Card variant="outline" className="border-gray-800 bg-gray-900/20 p-20 text-center">
          <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="text-gray-600" size={40} />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Nenhuma categoria encontrada</h3>
          <p className="text-gray-500 max-w-md mx-auto">Não encontramos nenhuma categoria com os termos buscados.</p>
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <Card padding="none" className="border-gray-800/50 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-800/30 border-b border-gray-800/50">
                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-gray-500">Categoria</th>
                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-gray-500">Slug</th>
                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-gray-500">Status</th>
                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-gray-500 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {filteredCategories.map((category) => (
                    <tr key={category.id} className="group hover:bg-purple-600/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-gray-800 rounded-2xl border border-gray-700/50 group-hover:border-purple-500/30 transition-colors">
                            <Tag size={20} className="text-gray-400 group-hover:text-purple-400 transition-colors" />
                          </div>
                          <div>
                            <p className="font-black text-white group-hover:text-purple-400 transition-colors">{category.name}</p>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">ID: {category.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="px-2 py-1 bg-gray-950 text-purple-400 rounded-lg text-xs font-bold border border-gray-800">
                          /{category.slug}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full animate-pulse", category.active ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500")} />
                          <span className={cn("text-xs font-black uppercase tracking-tighter", category.active ? "text-green-500" : "text-red-500")}>
                            {category.active ? 'Ativa' : 'Inativa'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/categories/${category.id}`}>
                            <Button variant="ghost" size="icon" className="hover:bg-purple-600/20 hover:text-purple-400">
                              <Pencil size={18} />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="icon" className="hover:bg-red-600/20 hover:text-red-400">
                            <Trash2 size={18} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          {/* Mobile & Tablet Card View */}
          <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCategories.map((category) => (
              <Card key={category.id} padding="none" className="group hover:border-purple-500/30 transition-all duration-300">
                <div className="p-5 flex items-center gap-4">
                  <div className="p-4 bg-gray-800 rounded-2xl border border-gray-700/50 shrink-0">
                    <Tag size={24} className="text-gray-400 group-hover:text-purple-400 transition-colors" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-black text-white text-lg leading-tight truncate group-hover:text-purple-400 transition-colors">{category.name}</h3>
                      <div className={cn("w-2.5 h-2.5 rounded-full shrink-0 mt-1.5", category.active ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500")} />
                    </div>
                    <code className="text-xs text-purple-500 font-bold">/{category.slug}</code>
                  </div>
                </div>
                <div className="px-5 py-4 bg-gray-800/30 border-t border-gray-800/50 flex items-center justify-between">
                  <span className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md", category.active ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
                    {category.active ? 'Ativa' : 'Inativa'}
                  </span>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/categories/${category.id}`}>
                      <Button variant="secondary" size="sm" leftIcon={<Pencil size={14} />}>Editar</Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

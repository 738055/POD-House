'use client';

import { useAuth } from '@/hooks/use-auth';
import { useState, useEffect } from 'react';
import { Plus, Pencil, Search, Trash2, List } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ConfirmModal } from '../components/ConfirmModal';
import { StatusToggle } from '../components/StatusToggle';

type Category = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  image_url: string | null;
};

export default function AdminCategoriesPage() {
  const { supabase } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      if (!supabase) return;
      setLoading(true);
      const { data, error } = await supabase.from('categories').select('id, name, slug, active, image_url').order('sort_order', { ascending: true });
      if (error) toast('Não foi possível carregar as categorias.', 'error');
      else setCategories(data as Category[]);
      setLoading(false);
    }
    fetchCategories();
  }, [supabase]);

  async function deleteCategory(id: string) {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      toast('Erro ao excluir categoria.', 'error');
    } else {
      toast('Categoria excluída.');
      setCategories(prev => prev.filter(c => c.id !== id));
    }
    setConfirmId(null);
  }

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-600/10 rounded-2xl"><List className="text-purple-500" size={28} /></div>
            <h1 className="text-4xl font-black text-white tracking-tight">Categorias</h1>
          </div>
          <p className="text-gray-400 font-medium ml-1">Organize seus produtos em categorias lógicas.</p>
        </div>
        <Link href="/admin/categories/new">
          <Button size="lg" leftIcon={<Plus size={20} />} className="w-full md:w-auto">Nova Categoria</Button>
        </Link>
      </div>

      <Card variant="outline" padding="sm" className="bg-gray-900/40 border-gray-800/50">
        <Input placeholder="Buscar por nome ou slug..." leftIcon={<Search size={18} />}
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-gray-900/60 border-gray-800/50" />
      </Card>

      {loading ? (
        <div className="flex justify-center p-24">
          <div className="w-16 h-16 border-4 border-purple-600/20 border-t-purple-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card variant="outline" className="border-gray-800 bg-gray-900/20 p-20 text-center">
          <Search className="text-gray-600 mx-auto mb-4" size={40} />
          <h3 className="text-2xl font-bold text-white mb-2">Nenhuma categoria encontrada</h3>
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block">
            <Card padding="none" className="border-gray-800/50 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-800/30 border-b border-gray-800/50">
                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-gray-500">Categoria</th>
                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-gray-500">Slug</th>
                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-gray-500">Ativo</th>
                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-gray-500 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {filtered.map(category => (
                    <tr key={category.id} className="group hover:bg-purple-600/5 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-black text-white group-hover:text-purple-400 transition-colors">{category.name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <code className="px-2 py-1 bg-gray-950 text-purple-400 rounded-lg text-xs font-bold border border-gray-800">/{category.slug}</code>
                      </td>
                      <td className="px-6 py-4">
                        <StatusToggle id={category.id} table="categories" active={category.active}
                          onToggle={v => setCategories(prev => prev.map(c => c.id === category.id ? { ...c, active: v } : c))} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/categories/${category.id}`}>
                            <Button variant="ghost" size="icon" className="hover:bg-purple-600/20 hover:text-purple-400"><Pencil size={17} /></Button>
                          </Link>
                          <Button variant="ghost" size="icon" className="hover:bg-red-600/20 hover:text-red-400" onClick={() => setConfirmId(category.id)}>
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
            {filtered.map(category => (
              <Card key={category.id} padding="none" className="group hover:border-purple-500/30 transition-all duration-300">
                <div className="p-5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-black text-white text-lg leading-tight truncate">{category.name}</h3>
                    <code className="text-xs text-purple-500 font-bold">/{category.slug}</code>
                  </div>
                  <StatusToggle id={category.id} table="categories" active={category.active}
                    onToggle={v => setCategories(prev => prev.map(c => c.id === category.id ? { ...c, active: v } : c))} />
                </div>
                <div className="px-5 py-4 bg-gray-800/30 border-t border-gray-800/50 flex items-center justify-end gap-2">
                  <Link href={`/admin/categories/${category.id}`}>
                    <Button variant="secondary" size="sm" leftIcon={<Pencil size={14} />}>Editar</Button>
                  </Link>
                  <Button variant="ghost" size="icon" className="hover:bg-red-600/20 hover:text-red-400 text-gray-500" onClick={() => setConfirmId(category.id)}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <ConfirmModal
        open={!!confirmId}
        title="Excluir categoria?"
        description="Os produtos vinculados perderão a categoria. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={() => deleteCategory(confirmId!)}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}

'use client';

import { useAuth } from '@/hooks/use-auth';
import { useState, useEffect } from 'react';
import { Plus, Pencil, Loader2, AlertCircle, Percent } from 'lucide-react';
import Link from 'next/link';

type Promotion = {
  id: string;
  title: string;
  description: string | null;
  badge: string | null;
  active: boolean;
};

export default function AdminPromotionsPage() {
  const { supabase } = useAuth();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPromotions() {
      if (!supabase) return;
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('promotions')
        .select('id, title, description, badge, active')
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Erro ao buscar promoções:', error);
        setError('Não foi possível carregar as promoções.');
      } else {
        setPromotions(data as Promotion[]);
      }
      setLoading(false);
    }

    fetchPromotions();
  }, [supabase]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Promoções</h1>
          <p className="text-gray-400">Gerencie os banners de promoções da sua loja.</p>
        </div>
        <Link href="/admin/promotions/new" className="bg-purple-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors">
          <Plus size={18} />
          Nova Promoção
        </Link>
      </div>

      {loading && <div className="flex justify-center p-12"><Loader2 className="animate-spin text-gray-400" size={32} /></div>}
      {error && <div className="bg-red-500/10 text-red-400 p-4 rounded-lg flex items-center gap-2"><AlertCircle size={18} /> {error}</div>}

      {!loading && !error && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-xs text-gray-400 uppercase bg-gray-800">
              <tr>
                <th scope="col" className="px-6 py-3">Título</th>
                <th scope="col" className="px-6 py-3">Badge</th>
                <th scope="col" className="px-6 py-3">Status</th>
                <th scope="col" className="px-6 py-3"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {promotions.map((promo) => (
                <tr key={promo.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <th scope="row" className="px-6 py-4 font-medium text-white whitespace-nowrap">
                    {promo.title}
                  </th>
                  <td className="px-6 py-4">{promo.badge || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${promo.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {promo.active ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/admin/promotions/${promo.id}`} className="p-2 rounded-md hover:bg-gray-700 text-blue-400 hover:text-blue-300">
                        <Pencil size={16} />
                    </Link>
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

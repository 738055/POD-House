'use client';

import { useAuth } from '@/hooks/use-auth';
import { useState, useEffect } from 'react';
import { Plus, Pencil, Loader2, AlertCircle, CalendarDays, Flame } from 'lucide-react';
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
    <div className="max-w-7xl mx-auto">
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

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        <Link href="/admin/promotions/calendar" className="flex items-center gap-4 bg-gray-900 border border-gray-700 rounded-xl p-4 hover:border-purple-500 transition-colors group">
          <div className="w-11 h-11 bg-purple-500/15 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/25 transition-colors">
            <CalendarDays size={22} className="text-purple-400" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">Calendário de Promoções</p>
            <p className="text-gray-400 text-xs">Agende promoções e cupons por dia/hora</p>
          </div>
        </Link>
        <Link href="/admin/promotions/daily-specials" className="flex items-center gap-4 bg-gray-900 border border-gray-700 rounded-xl p-4 hover:border-orange-500 transition-colors group">
          <div className="w-11 h-11 bg-orange-500/15 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-orange-500/25 transition-colors">
            <Flame size={22} className="text-orange-400" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">Produtos do Dia</p>
            <p className="text-gray-400 text-xs">Destaque produtos/sabores por dia da semana</p>
          </div>
        </Link>
      </div>

      {loading && <div className="flex justify-center p-12"><Loader2 className="animate-spin text-gray-400" size={32} /></div>}
      {error && <div className="bg-red-500/10 text-red-400 p-4 rounded-lg flex items-center gap-2"><AlertCircle size={18} /> {error}</div>}

      {!loading && !error && (
        <>
          {/* Tabela para Desktop */}
          <div className="hidden lg:block bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
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

          {/* Cards para Mobile */}
          <div className="lg:hidden space-y-4">
            {promotions.map((promo) => (
              <div key={promo.id} className="bg-gray-900 p-4 rounded-lg border border-gray-800 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">{promo.title}</p>
                  <p className="text-sm text-gray-400">Badge: {promo.badge || 'N/A'}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${promo.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {promo.active ? 'Ativa' : 'Inativa'}
                  </span>
                  <Link href={`/admin/promotions/${promo.id}`} className="p-2 rounded-md hover:bg-gray-700 text-blue-400 hover:text-blue-300 mt-2">
                    <Pencil size={16} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

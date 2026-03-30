'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// Schema de validação com Zod
const promotionSchema = z.object({
  title: z.string().min(3, 'O título é obrigatório (mín. 3 caracteres).'),
  description: z.string().optional(),
  image_url: z.string().url('URL da imagem inválida.').optional().or(z.literal('')),
  badge: z.string().optional(),
  sort_order: z.preprocess((val) => parseInt(String(val), 10), z.number().int().default(0)),
  active: z.boolean().default(true),
});

type PromotionFormValues = z.infer<typeof promotionSchema>;

export default function EditPromotionPage() {
  const { supabase } = useAuth();
  const router = useRouter();
  const params = useParams();
  const promotionId = params.id as string;

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PromotionFormValues>({
    resolver: zodResolver(promotionSchema),
  });

  useEffect(() => {
    async function fetchPromotion() {
      if (!supabase || !promotionId) return;
      setLoadingData(true);

      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('id', promotionId)
        .single();

      if (error) {
        setError('Não foi possível carregar a promoção.');
        console.error(error);
      } else {
        reset(data);
      }
      setLoadingData(false);
    }
    fetchPromotion();
  }, [supabase, promotionId, reset]);

  async function onSubmit(data: PromotionFormValues) {
    setIsSubmitting(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('promotions')
        .update({
          title: data.title,
          description: data.description,
          image_url: data.image_url || null,
          badge: data.badge,
          sort_order: data.sort_order,
          active: data.active,
        })
        .eq('id', promotionId);

      if (updateError) throw updateError;

      router.push('/admin/promotions');
      
    } catch (err: any) {
      console.error('Erro ao atualizar promoção:', err);
      setError(`Erro ao atualizar a promoção: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loadingData) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-gray-400" size={32} /></div>
  }

  return (
    <div>
       <div className="flex items-center gap-4 mb-8">
         <Link href="/admin/promotions" className="p-2 rounded-md hover:bg-gray-800">
           <ArrowLeft size={20} />
         </Link>
         <div>
           <h1 className="text-3xl font-bold text-white">Editar Promoção</h1>
           <p className="text-gray-400">Atualize as informações do banner de promoção.</p>
         </div>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-8">
        {error && (
          <div className="bg-red-500/10 text-red-400 p-4 rounded-lg flex items-center gap-2">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl">
          <div className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">Título da Promoção</label>
              <input {...register('title')} id="title" className="w-full bg-gray-800 border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
              {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title.message}</p>}
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">Descrição (opcional)</label>
              <textarea {...register('description')} id="description" rows={3} className="w-full bg-gray-800 border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"></textarea>
            </div>

            <div>
              <label htmlFor="image_url" className="block text-sm font-medium text-gray-300 mb-1">URL da Imagem do Banner</label>
              <input {...register('image_url')} id="image_url" placeholder="https://" className="w-full bg-gray-800 border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
               {errors.image_url && <p className="text-red-400 text-sm mt-1">{errors.image_url.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="badge" className="block text-sm font-medium text-gray-300 mb-1">Badge (texto curto, opcional)</label>
                    <input {...register('badge')} id="badge" placeholder="Ex: NOVIDADE" className="w-full bg-gray-800 border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                    <label htmlFor="sort_order" className="block text-sm font-medium text-gray-300 mb-1">Ordem de Exibição</label>
                    <input {...register('sort_order')} id="sort_order" type="number" className="w-full bg-gray-800 border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" {...register('active')} className="w-4 h-4 rounded text-purple-600 bg-gray-800 border-gray-600 focus:ring-purple-500" />
                Promoção Ativa
              </label>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-4">
          <Link href="/admin/promotions" className="px-6 py-2.5 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors">Cancelar</Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-purple-600 text-white font-bold py-2.5 px-6 rounded-lg flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors disabled:bg-purple-400 disabled:cursor-wait"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : null}
            <span>{isSubmitting ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

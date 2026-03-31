'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ImageUpload } from '../../components/ImageUpload';
import { useToast } from '@/hooks/use-toast';

const promotionSchema = z.object({
  title: z.string().min(3, 'O título é obrigatório (mín. 3 caracteres).'),
  description: z.string().optional(),
  image_url: z.string().nullable().optional(),
  badge: z.string().optional(),
  sort_order: z.preprocess((val) => parseInt(String(val), 10), z.number().int().default(0)),
  active: z.boolean().default(true),
});

type PromotionFormValues = z.infer<typeof promotionSchema>;

export default function NewPromotionPage() {
  const { supabase } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<PromotionFormValues>({
    resolver: zodResolver(promotionSchema),
    defaultValues: { active: true, sort_order: 0 },
  });

  const imageUrl = watch('image_url');

  async function onSubmit(data: PromotionFormValues) {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('promotions').insert({
        title: data.title,
        description: data.description,
        image_url: data.image_url || null,
        badge: data.badge,
        sort_order: data.sort_order,
        active: data.active,
      });
      if (error) throw error;
      toast('Promoção criada com sucesso!');
      router.push('/admin/promotions');
    } catch (err: any) {
      toast(`Erro ao criar promoção: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/promotions" className="p-2 rounded-md hover:bg-gray-800"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-3xl font-bold text-white">Nova Promoção</h1>
          <p className="text-gray-400">Preencha as informações para criar um novo banner.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Título da Promoção</label>
            <input {...register('title')} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Descrição (opcional)</label>
            <textarea {...register('description')} rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>

          <ImageUpload
            bucket="promotion-images"
            currentUrl={imageUrl}
            onUpload={(url) => setValue('image_url', url)}
            onRemove={() => setValue('image_url', null)}
            label="Imagem do Banner"
            aspectRatio="wide"
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Badge (ex: NOVIDADE)</label>
              <input {...register('badge')} placeholder="opcional" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Ordem de Exibição</label>
              <input {...register('sort_order')} type="number" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" {...register('active')} className="w-4 h-4 rounded text-purple-600 bg-gray-800 border-gray-600" />
            Promoção Ativa
          </label>
        </div>

        <div className="flex justify-end gap-4">
          <Link href="/admin/promotions" className="px-6 py-2.5 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors">Cancelar</Link>
          <button type="submit" disabled={isSubmitting} className="bg-purple-600 text-white font-bold py-2.5 px-6 rounded-lg flex items-center gap-2 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-wait">
            {isSubmitting && <Loader2 className="animate-spin" size={18} />}
            {isSubmitting ? 'Salvando...' : 'Salvar Promoção'}
          </button>
        </div>
      </form>
    </div>
  );
}

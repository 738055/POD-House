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

const generateSlug = (name: string) =>
  name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

const categorySchema = z.object({
  name: z.string().min(2, 'O nome da categoria é obrigatório (mín. 2 caracteres).'),
  slug: z.string().min(2, 'O slug é obrigatório.'),
  image_url: z.string().nullable().optional(),
  sort_order: z.preprocess((val) => parseInt(String(val), 10), z.number().int().default(0)),
  active: z.boolean().default(true),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export default function NewCategoryPage() {
  const { supabase } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { active: true, sort_order: 0 },
  });

  const watchName = watch('name');
  const watchImageUrl = watch('image_url');

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('name', e.target.value);
    setValue('slug', generateSlug(e.target.value));
  };

  async function onSubmit(data: CategoryFormValues) {
    setIsSubmitting(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from('categories').insert({
        name: data.name,
        slug: data.slug,
        image_url: data.image_url || null,
        sort_order: data.sort_order,
        active: data.active,
      });
      if (insertError) throw insertError;
      router.push('/admin/categories');
    } catch (err: any) {
      setError(`Erro ao criar a categoria: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/categories" className="p-2 rounded-md hover:bg-gray-800">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">Nova Categoria</h1>
          <p className="text-gray-400">Preencha as informações para criar uma nova categoria.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {error && (
          <div className="bg-red-500/10 text-red-400 p-4 rounded-lg flex items-center gap-2">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nome da Categoria</label>
            <input
              id="name"
              value={watchName || ''}
              onChange={handleNameChange}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Slug</label>
            <input {...register('slug')} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            {errors.slug && <p className="text-red-400 text-sm mt-1">{errors.slug.message}</p>}
          </div>

          <ImageUpload
            bucket="category-images"
            currentUrl={watchImageUrl}
            onUpload={(url) => setValue('image_url', url)}
            onRemove={() => setValue('image_url', null)}
            label="Imagem da Categoria (opcional)"
            aspectRatio="landscape"
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Ordem de Exibição</label>
              <input {...register('sort_order')} type="number" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" {...register('active')} className="w-4 h-4 rounded text-purple-600 bg-gray-800 border-gray-600 focus:ring-purple-500" />
                Categoria Ativa
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Link href="/admin/categories" className="px-6 py-2.5 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors">Cancelar</Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-purple-600 text-white font-bold py-2.5 px-6 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors disabled:bg-purple-400 disabled:cursor-wait"
          >
            {isSubmitting && <Loader2 className="animate-spin" size={18} />}
            {isSubmitting ? 'Salvando...' : 'Salvar Categoria'}
          </button>
        </div>
      </form>
    </div>
  );
}

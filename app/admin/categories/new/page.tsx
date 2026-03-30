'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// Função para gerar slug a partir de uma string
const generateSlug = (name: string) => {
  return name
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^\w-]+/g, '');
};

// Schema de validação com Zod
const categorySchema = z.object({
  name: z.string().min(2, 'O nome da categoria é obrigatório (mín. 2 caracteres).'),
  slug: z.string().min(2, 'O slug é obrigatório.'),
  image_url: z.string().url('URL da imagem inválida.').optional().or(z.literal('')),
  sort_order: z.preprocess((val) => parseInt(String(val), 10), z.number().int().default(0)),
  active: z.boolean().default(true),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export default function NewCategoryPage() {
  const { supabase } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      active: true,
      sort_order: 0,
    },
  });

  const watchName = watch('name');
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setValue('name', name);
    setValue('slug', generateSlug(name));
  };
  
  async function onSubmit(data: CategoryFormValues) {
    setIsSubmitting(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('categories')
        .insert({
          name: data.name,
          slug: data.slug,
          image_url: data.image_url || null,
          sort_order: data.sort_order,
          active: data.active,
        });

      if (insertError) throw insertError;

      router.push('/admin/categories');
      
    } catch (err: any) {
      console.error('Erro ao criar categoria:', err);
      setError(`Erro ao criar a categoria: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
       <div className="flex items-center gap-4 mb-8">
         <Link href="/admin/categories" className="p-2 rounded-md hover:bg-gray-800">
           <ArrowLeft size={20} />
         </Link>
         <div>
           <h1 className="text-3xl font-bold text-white">Nova Categoria</h1>
           <p className="text-gray-400">Preencha as informações para criar uma nova categoria.</p>
         </div>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-8">
        {error && (
          <div className="bg-red-500/10 text-red-400 p-4 rounded-lg flex items-center gap-2">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">Nome da Categoria</label>
              <input 
                id="name"
                value={watchName || ''}
                onChange={handleNameChange}
                className="w-full bg-gray-800 border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" 
              />
              {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>}
            </div>
            
            <div className="col-span-2">
              <label htmlFor="slug" className="block text-sm font-medium text-gray-300 mb-1">Slug</label>
              <input {...register('slug')} id="slug" className="w-full bg-gray-800 border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
              {errors.slug && <p className="text-red-400 text-sm mt-1">{errors.slug.message}</p>}
            </div>

            <div className="col-span-2">
              <label htmlFor="image_url" className="block text-sm font-medium text-gray-300 mb-1">URL da Imagem (opcional)</label>
              <input {...register('image_url')} id="image_url" placeholder="https://" className="w-full bg-gray-800 border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
               {errors.image_url && <p className="text-red-400 text-sm mt-1">{errors.image_url.message}</p>}
            </div>
             
            <div>
              <label htmlFor="sort_order" className="block text-sm font-medium text-gray-300 mb-1">Ordem de Exibição</label>
              <input {...register('sort_order')} id="sort_order" type="number" className="w-full bg-gray-800 border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
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
            className="bg-purple-600 text-white font-bold py-2.5 px-6 rounded-lg flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors disabled:bg-purple-400 disabled:cursor-wait"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : null}
            <span>{isSubmitting ? 'Salvando...' : 'Salvar Categoria'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { ImageUpload } from '../../components/ImageUpload';

const variantSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'O nome da variação é obrigatório.'),
  price_override: z.preprocess(
    (val) => (val === '' || val === null ? null : parseFloat(String(val).replace(',', '.'))),
    z.number().positive('O preço deve ser positivo.').nullable()
  ),
  stock: z.preprocess((val) => parseInt(String(val), 10), z.number().int().min(0, 'O estoque não pode ser negativo.')),
  image_url: z.string().nullable().optional(),
});

const productSchema = z.object({
  name: z.string().min(3, 'O nome do produto é obrigatório (mín. 3 caracteres).'),
  description: z.string().optional(),
  base_price: z.preprocess(
    (val) => parseFloat(String(val).replace(',', '.')),
    z.number().positive('O preço base deve ser um número positivo.')
  ),
  category_id: z.string().uuid('Selecione uma categoria válida.'),
  puffs: z.string().optional(),
  is_featured: z.boolean().default(false),
  active: z.boolean().default(true),
  variants: z.array(variantSchema).min(1, 'Adicione pelo menos uma variação (sabor/modelo).'),
});

type ProductFormValues = z.infer<typeof productSchema>;
type Category = { id: string; name: string };

export default function EditProductPage() {
  const { supabase } = useAuth();
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [originalVariants, setOriginalVariants] = useState<any[]>([]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'variants' });

  useEffect(() => {
    async function init() {
      if (!supabase || !productId) return;
      setLoadingData(true);

      const [catRes, prodRes] = await Promise.all([
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('products').select('*, product_variants(*)').eq('id', productId).single(),
      ]);

      if (catRes.data) setCategories(catRes.data);

      if (prodRes.error) {
        setError('Não foi possível carregar o produto.');
      } else {
        setOriginalVariants(prodRes.data.product_variants);
        reset({
          name: prodRes.data.name,
          description: prodRes.data.description || '',
          base_price: prodRes.data.base_price,
          category_id: prodRes.data.category_id,
          puffs: prodRes.data.puffs || '',
          is_featured: prodRes.data.is_featured,
          active: prodRes.data.active,
          variants: prodRes.data.product_variants.map((v: any) => ({
            id: v.id,
            name: v.name,
            price_override: v.price_override,
            stock: v.stock,
            image_url: v.image_url,
          })),
        });
      }
      setLoadingData(false);
    }
    init();
  }, [supabase, productId, reset]);

  async function onSubmit(data: ProductFormValues) {
    setIsSubmitting(true);
    setError(null);
    try {
      const { error: productError } = await supabase
        .from('products')
        .update({
          name: data.name,
          description: data.description,
          base_price: data.base_price,
          category_id: data.category_id,
          puffs: data.puffs,
          is_featured: data.is_featured,
          active: data.active,
        })
        .eq('id', productId);

      if (productError) throw productError;

      const variantsToUpsert = data.variants.map((v) => ({
        id: v.id,
        product_id: productId,
        name: v.name,
        price_override: v.price_override,
        stock: v.stock,
        image_url: v.image_url || null,
        active: true,
      }));

      const { error: variantsError } = await supabase.from('product_variants').upsert(variantsToUpsert);
      if (variantsError) throw variantsError;

      const submittedIds = new Set(data.variants.map(v => v.id).filter(Boolean));
      const toDelete = originalVariants.filter(v => !submittedIds.has(v.id));
      if (toDelete.length > 0) {
        await supabase.from('product_variants').delete().in('id', toDelete.map(v => v.id));
      }

      router.push('/admin/products');
    } catch (err: any) {
      setError(`Erro ao atualizar o produto: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loadingData) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-gray-400" size={32} /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/products" className="p-2 rounded-md hover:bg-gray-800">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">Editar Produto</h1>
          <p className="text-gray-400">Atualize as informações do produto.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {error && (
          <div className="bg-red-500/10 text-red-400 p-4 rounded-lg flex items-center gap-2">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {/* Informações Básicas */}
        <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl">
          <h2 className="text-xl font-semibold mb-4">Informações Básicas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">Nome do Produto</label>
              <input {...register('name')} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
              {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Preço Base (R$)</label>
              <input {...register('base_price')} type="text" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
              {errors.base_price && <p className="text-red-400 text-sm mt-1">{errors.base_price.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Categoria</label>
              <select {...register('category_id')} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">Selecione...</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
              {errors.category_id && <p className="text-red-400 text-sm mt-1">{errors.category_id.message}</p>}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">Descrição</label>
              <textarea {...register('description')} rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Puffs (opcional)</label>
              <input {...register('puffs')} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>

            <div className="flex items-end gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" {...register('active')} className="w-4 h-4 rounded text-purple-600 bg-gray-800 border-gray-600" />
                Produto Ativo
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" {...register('is_featured')} className="w-4 h-4 rounded text-purple-600 bg-gray-800 border-gray-600" />
                Destaque
              </label>
            </div>
          </div>
        </div>

        {/* Variações */}
        <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl">
          <h2 className="text-xl font-semibold mb-4">Variações (Sabores / Modelos)</h2>
          {errors.variants?.root && (
            <p className="text-red-400 text-sm mb-4 bg-red-500/10 p-3 rounded-lg">{errors.variants.root.message}</p>
          )}

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <div className="grid grid-cols-12 gap-4 items-start">
                  {/* Imagem */}
                  <div className="col-span-12 sm:col-span-3">
                    <ImageUpload
                      bucket="product-images"
                      folder="variants"
                      currentUrl={watch(`variants.${index}.image_url`)}
                      onUpload={(url) => setValue(`variants.${index}.image_url`, url)}
                      onRemove={() => setValue(`variants.${index}.image_url`, null)}
                      label="Imagem do Sabor"
                      aspectRatio="square"
                    />
                  </div>

                  {/* Campos */}
                  <div className="col-span-12 sm:col-span-9 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-medium text-gray-400 mb-1">Nome da Variação *</label>
                      <input
                        {...register(`variants.${index}.name`)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      {errors.variants?.[index]?.name && (
                        <p className="text-red-400 text-xs mt-1">{errors.variants[index]!.name!.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Preço Override (R$)</label>
                      <input
                        {...register(`variants.${index}.price_override`)}
                        type="text"
                        placeholder="Deixar vazio = preço base"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Estoque</label>
                      <input
                        {...register(`variants.${index}.stock`)}
                        type="number"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        disabled={fields.length <= 1}
                        className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed px-3 py-2 rounded-lg hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={14} /> Remover variação
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => append({ name: '', price_override: null, stock: 0, image_url: null })}
              className="flex items-center gap-2 text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors"
            >
              <Plus size={16} /> Adicionar outra variação
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Link href="/admin/products" className="px-6 py-2.5 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-purple-600 text-white font-bold py-2.5 px-6 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors disabled:bg-purple-400 disabled:cursor-wait"
          >
            {isSubmitting && <Loader2 className="animate-spin" size={18} />}
            {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  );
}

'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Loader2, AlertCircle, ArrowLeft, Plus, Trash2, Wind,
  Package, Star, Eye, EyeOff, GripVertical, Info, Palette,
  DollarSign, Box, Hash
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { ImageUpload } from '../../components/ImageUpload';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const variantSchema = z.object({
  name: z.string().min(1, 'Nome do sabor é obrigatório.'),
  description: z.string().optional(),
  price_override: z.preprocess(
    (val) => (val === '' || val === null ? null : parseFloat(String(val).replace(',', '.'))),
    z.number().positive('O preço deve ser positivo.').nullable()
  ),
  stock: z.preprocess((val) => parseInt(String(val), 10), z.number().int().min(0, 'Estoque não pode ser negativo.')),
  image_url: z.string().nullable().optional(),
});

const productSchema = z.object({
  name: z.string().min(3, 'Nome do produto é obrigatório (mín. 3 caracteres).'),
  description: z.string().optional(),
  base_price: z.preprocess(
    (val) => parseFloat(String(val).replace(',', '.')),
    z.number().positive('O preço base deve ser positivo.')
  ),
  category_id: z.string().uuid('Selecione uma categoria.'),
  puffs: z.string().optional(),
  is_featured: z.boolean().default(false),
  active: z.boolean().default(true),
  variants: z.array(variantSchema).min(1, 'Adicione pelo menos um sabor.'),
});

type ProductFormValues = z.infer<typeof productSchema>;
type Category = { id: string; name: string };

export default function NewProductPage() {
  const { supabase } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState<'info' | 'flavors'>('info');

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      active: true,
      is_featured: false,
      variants: [{ name: '', description: '', price_override: null, stock: 0, image_url: null }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'variants' });
  const watchedVariants = watch('variants');
  const watchedName = watch('name');
  const watchedPrice = watch('base_price');

  useEffect(() => {
    async function fetchCategories() {
      if (!supabase) return;
      const { data, error } = await supabase.from('categories').select('id, name').order('name');
      if (error) setError('Não foi possível carregar as categorias.');
      else setCategories(data);
    }
    fetchCategories();
  }, [supabase]);

  async function onSubmit(data: ProductFormValues) {
    setIsSubmitting(true);
    setError(null);
    try {
      const { data: productData, error: productError } = await supabase
        .from('products')
        .insert({
          name: data.name,
          description: data.description,
          base_price: data.base_price,
          category_id: data.category_id,
          puffs: data.puffs,
          is_featured: data.is_featured,
          active: data.active,
        })
        .select('id')
        .single();

      if (productError) throw productError;

      const variantsToInsert = data.variants.map((v, i) => ({
        product_id: productData.id,
        name: v.name,
        description: v.description || null,
        price_override: v.price_override,
        stock: v.stock,
        image_url: v.image_url || null,
        active: true,
        sort_order: i,
      }));

      const { error: variantsError } = await supabase.from('product_variants').insert(variantsToInsert);
      if (variantsError) throw variantsError;

      toast('Produto criado com sucesso!', 'success');
      router.push('/admin/products');
    } catch (err: any) {
      setError(`Erro ao criar o produto: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  function formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/products" className="p-2.5 rounded-xl hover:bg-gray-800 transition-colors text-gray-400 hover:text-white">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-grow">
          <h1 className="text-2xl lg:text-3xl font-black text-white">Novo Produto</h1>
          <p className="text-gray-500 text-sm font-medium">Cadastre um novo POD com seus sabores</p>
        </div>
      </div>

      {/* Section Tabs (Mobile) */}
      <div className="lg:hidden flex bg-gray-900 rounded-xl p-1 mb-6 border border-gray-800">
        <button
          type="button"
          onClick={() => setActiveSection('info')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all',
            activeSection === 'info' ? 'bg-purple-600 text-white' : 'text-gray-400'
          )}
        >
          <Package size={16} /> Informações
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('flavors')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all',
            activeSection === 'flavors' ? 'bg-purple-600 text-white' : 'text-gray-400'
          )}
        >
          <Palette size={16} /> Sabores ({fields.length})
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3 mb-6">
            <AlertCircle size={18} className="shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Product Info */}
          <div className={cn('lg:col-span-5 space-y-5', activeSection !== 'info' && 'hidden lg:block')}>
            {/* Basic Info */}
            <Card className="border-gray-800/60">
              <div className="flex items-center gap-2 mb-5">
                <div className="p-1.5 bg-purple-500/10 rounded-lg">
                  <Package size={16} className="text-purple-400" />
                </div>
                <h2 className="text-base font-black text-white">Informações do Produto</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
                    Nome do Produto *
                  </label>
                  <input
                    {...register('name')}
                    placeholder="Ex: Ignite V80"
                    className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all text-sm font-medium"
                  />
                  {errors.name && <p className="text-red-400 text-xs mt-1.5 font-medium">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
                    Descrição
                  </label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    placeholder="Descreva as características do produto..."
                    className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all text-sm resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
                      Preço Base (R$) *
                    </label>
                    <div className="relative">
                      <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        {...register('base_price')}
                        type="text"
                        placeholder="29,90"
                        className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl pl-9 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all text-sm font-medium"
                      />
                    </div>
                    {errors.base_price && <p className="text-red-400 text-xs mt-1.5 font-medium">{errors.base_price.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
                      Puffs
                    </label>
                    <div className="relative">
                      <Wind size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        {...register('puffs')}
                        placeholder="8000"
                        className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl pl-9 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all text-sm font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
                    Categoria *
                  </label>
                  <select
                    {...register('category_id')}
                    className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all text-sm font-medium appearance-none cursor-pointer"
                  >
                    <option value="">Selecione uma categoria...</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                  {errors.category_id && <p className="text-red-400 text-xs mt-1.5 font-medium">{errors.category_id.message}</p>}
                </div>
              </div>
            </Card>

            {/* Settings */}
            <Card className="border-gray-800/60">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-purple-500/10 rounded-lg">
                  <Info size={16} className="text-purple-400" />
                </div>
                <h2 className="text-base font-black text-white">Configurações</h2>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 bg-gray-800/40 rounded-xl cursor-pointer hover:bg-gray-800/60 transition-colors group">
                  <div className="flex items-center gap-3">
                    <Eye size={16} className="text-emerald-400" />
                    <div>
                      <p className="text-sm font-bold text-white">Produto Ativo</p>
                      <p className="text-[11px] text-gray-500">Visível no catálogo da loja</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    {...register('active')}
                    className="w-5 h-5 rounded-md text-purple-600 bg-gray-700 border-gray-600 focus:ring-purple-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-gray-800/40 rounded-xl cursor-pointer hover:bg-gray-800/60 transition-colors group">
                  <div className="flex items-center gap-3">
                    <Star size={16} className="text-amber-400" />
                    <div>
                      <p className="text-sm font-bold text-white">Destaque</p>
                      <p className="text-[11px] text-gray-500">Aparece na seção de destaques</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    {...register('is_featured')}
                    className="w-5 h-5 rounded-md text-purple-600 bg-gray-700 border-gray-600 focus:ring-purple-500 cursor-pointer"
                  />
                </label>
              </div>
            </Card>

            {/* Preview Card */}
            {watchedName && (
              <Card className="border-gray-800/60 bg-gradient-to-br from-gray-900 to-gray-900/80">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-purple-500/10 rounded-lg">
                    <Eye size={16} className="text-purple-400" />
                  </div>
                  <h2 className="text-base font-black text-white">Preview</h2>
                </div>

                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/30">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gray-700 flex items-center justify-center overflow-hidden">
                      {watchedVariants?.[0]?.image_url ? (
                        <Image src={watchedVariants[0].image_url} alt="" width={48} height={48} className="object-contain" unoptimized />
                      ) : (
                        <Package size={20} className="text-gray-500" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-black text-white text-sm">{watchedName || 'Nome do Produto'}</h4>
                      <p className="text-purple-400 font-black text-lg">
                        {watchedPrice ? formatCurrency(Number(String(watchedPrice).replace(',', '.'))) : 'R$ 0,00'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {watchedVariants?.filter(v => v.name).map((v, i) => (
                      <span key={i} className="text-[10px] font-bold text-gray-300 bg-gray-700 px-2 py-1 rounded-md">
                        {v.name}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column - Flavors */}
          <div className={cn('lg:col-span-7 space-y-4', activeSection !== 'flavors' && 'hidden lg:block')}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-500/10 rounded-lg">
                  <Palette size={16} className="text-blue-400" />
                </div>
                <h2 className="text-base font-black text-white">Sabores / Variações</h2>
                <span className="text-xs font-bold text-gray-500 bg-gray-800 px-2 py-0.5 rounded-md">
                  {fields.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => append({ name: '', description: '', price_override: null, stock: 0, image_url: null })}
                className="flex items-center gap-1.5 text-xs font-bold text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 px-3 py-2 rounded-xl transition-all"
              >
                <Plus size={14} /> Novo Sabor
              </button>
            </div>

            {errors.variants?.root && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm font-medium">
                {errors.variants.root.message}
              </div>
            )}

            <div className="space-y-4">
              {fields.map((field, index) => {
                const variantImage = watch(`variants.${index}.image_url`);
                const variantName = watch(`variants.${index}.name`);

                return (
                  <Card
                    key={field.id}
                    padding="none"
                    className="border-gray-800/60 hover:border-purple-500/20 transition-all duration-300 overflow-hidden"
                  >
                    {/* Flavor Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-800/30 border-b border-gray-800/40">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-purple-600/20 flex items-center justify-center">
                          <span className="text-[10px] font-black text-purple-400">{index + 1}</span>
                        </div>
                        <h3 className="text-sm font-bold text-white">
                          {variantName || `Sabor ${index + 1}`}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        disabled={fields.length <= 1}
                        className="flex items-center gap-1 text-[11px] font-bold text-red-400/70 hover:text-red-400 disabled:opacity-20 disabled:cursor-not-allowed px-2 py-1.5 rounded-lg hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 size={12} /> Remover
                      </button>
                    </div>

                    <div className="p-4">
                      <div className="grid grid-cols-12 gap-4">
                        {/* Image Upload - Left */}
                        <div className="col-span-12 sm:col-span-4">
                          <ImageUpload
                            bucket="product-images"
                            folder="variants"
                            currentUrl={variantImage}
                            onUpload={(url) => setValue(`variants.${index}.image_url`, url)}
                            onRemove={() => setValue(`variants.${index}.image_url`, null)}
                            label="Foto do Sabor"
                            aspectRatio="square"
                          />
                        </div>

                        {/* Fields - Right */}
                        <div className="col-span-12 sm:col-span-8 space-y-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-400 mb-1 uppercase tracking-wider">
                              Nome do Sabor *
                            </label>
                            <input
                              {...register(`variants.${index}.name`)}
                              placeholder="Ex: Watermelon Ice"
                              className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all font-medium"
                            />
                            {errors.variants?.[index]?.name && (
                              <p className="text-red-400 text-[11px] mt-1 font-medium">{errors.variants[index]!.name!.message}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-gray-400 mb-1 uppercase tracking-wider">
                              Descrição do Sabor
                            </label>
                            <textarea
                              {...register(`variants.${index}.description`)}
                              rows={2}
                              placeholder="Ex: Melancia gelada com toque mentolado..."
                              className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all resize-none"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-gray-400 mb-1 uppercase tracking-wider">
                                Preço (R$)
                              </label>
                              <div className="relative">
                                <DollarSign size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                  {...register(`variants.${index}.price_override`)}
                                  type="text"
                                  placeholder="Preço base"
                                  className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl pl-8 pr-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all font-medium"
                                />
                              </div>
                              <p className="text-[10px] text-gray-600 mt-1">Vazio = preço base</p>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-gray-400 mb-1 uppercase tracking-wider">
                                Estoque
                              </label>
                              <div className="relative">
                                <Box size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                  {...register(`variants.${index}.stock`)}
                                  type="number"
                                  min={0}
                                  className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl pl-8 pr-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all font-medium"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}

              {/* Add Flavor Button (Large) */}
              <button
                type="button"
                onClick={() => append({ name: '', description: '', price_override: null, stock: 0, image_url: null })}
                className="w-full border-2 border-dashed border-gray-700/50 hover:border-purple-500/40 rounded-2xl p-8 flex flex-col items-center gap-2 transition-all hover:bg-purple-500/5 group"
              >
                <div className="p-3 bg-gray-800/60 rounded-xl group-hover:bg-purple-500/20 transition-colors">
                  <Plus size={24} className="text-gray-500 group-hover:text-purple-400 transition-colors" />
                </div>
                <span className="text-sm font-bold text-gray-500 group-hover:text-purple-400 transition-colors">
                  Adicionar outro sabor
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="sticky bottom-0 mt-8 -mx-4 px-4 py-4 bg-gray-950/90 backdrop-blur-xl border-t border-gray-800/50 lg:-mx-0 lg:px-0 lg:bg-transparent lg:border-none lg:backdrop-blur-none">
          <div className="flex items-center justify-between gap-4">
            <div className="hidden lg:flex items-center gap-3 text-sm text-gray-500">
              <span className="font-bold">{fields.length}</span> sabores cadastrados
            </div>
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <Link href="/admin/products" className="flex-1 lg:flex-none">
                <Button variant="outline" className="w-full" type="button">Cancelar</Button>
              </Link>
              <Button
                type="submit"
                isLoading={isSubmitting}
                leftIcon={<Package size={18} />}
                className="flex-1 lg:flex-none lg:px-8"
              >
                {isSubmitting ? 'Criando...' : 'Criar Produto'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

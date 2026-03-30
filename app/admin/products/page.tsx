'use client';

import { useAuth } from '@/hooks/use-auth';
import { useState, useEffect } from 'react';
import { Plus, Pencil, Loader2, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

type ProductForAdminList = {
  id: string;
  name: string;
  base_price: number;
  active: boolean;
  is_featured: boolean;
  categories: { name: string } | null;
  product_variants: { image_url: string | null }[];
};

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function AdminProductsPage() {
  const { supabase } = useAuth();
  const [products, setProducts] = useState<ProductForAdminList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      if (!supabase) return;
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          base_price,
          active,
          is_featured,
          categories ( name ),
          product_variants ( image_url )
        `)
        .order('name', { ascending: true });

      if (error) {
        console.error('Erro ao buscar produtos:', error);
        setError('Não foi possível carregar os produtos.');
      } else {
        setProducts(data as ProductForAdminList[]);
      }
      setLoading(false);
    }

    fetchProducts();
  }, [supabase]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Produtos</h1>
          <p className="text-gray-400">Gerencie os produtos da sua loja.</p>
        </div>
        <Link href="/admin/products/new" className="bg-purple-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors">
          <Plus size={18} />
          Novo Produto
        </Link>
      </div>

      {loading && <div className="flex justify-center p-12"><Loader2 className="animate-spin text-gray-400" size={32} /></div>}
      {error && <div className="bg-red-500/10 text-red-400 p-4 rounded-lg flex items-center gap-2"><AlertCircle size={18} /> {error}</div>}

      {!loading && !error && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-xs text-gray-400 uppercase bg-gray-800">
              <tr>
                <th scope="col" className="px-6 py-3">Produto</th>
                <th scope="col" className="px-6 py-3">Categoria</th>
                <th scope="col" className="px-6 py-3">Preço Base</th>
                <th scope="col" className="px-6 py-3">Status</th>
                <th scope="col" className="px-6 py-3"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <th scope="row" className="px-6 py-4 font-medium text-white whitespace-nowrap flex items-center gap-3">
                    <Image src={product.product_variants[0]?.image_url || '/logo.png'} alt={product.name} width={40} height={40} className="rounded-md bg-gray-700 object-contain p-1" />
                    {product.name}
                  </th>
                  <td className="px-6 py-4">{product.categories?.name || 'N/A'}</td>
                  <td className="px-6 py-4">{formatCurrency(product.base_price)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${product.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {product.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/admin/products/${product.id}`} className="p-2 rounded-md hover:bg-gray-700 text-blue-400 hover:text-blue-300">
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
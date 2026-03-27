'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Plus, Trash2, Edit2, Package, Image as ImageIcon, Layers } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [variationModalProduct, setVariationModalProduct] = useState<any>(null);
  const [productVariations, setProductVariations] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryId: '',
    active: true
  });

  const [variationFormData, setVariationFormData] = useState({
    variationName: '',
    salePrice: 0,
    stock: 0,
    imageUrl: '',
    active: true
  });

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'products'));

    const qCat = query(collection(db, 'categories'), orderBy('name'));
    const unsubscribeCat = onSnapshot(qCat, (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'categories'));

    return () => {
      unsubscribe();
      unsubscribeCat();
    };
  }, []);

  useEffect(() => {
    if (variationModalProduct) {
      const q = query(collection(db, 'variations'), where('productId', '==', variationModalProduct.id));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setProductVariations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribe();
    }
  }, [variationModalProduct]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.categoryId) return;

    try {
      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), formData);
      } else {
        await addDoc(collection(db, 'products'), {
          ...formData,
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setEditingProduct(null);
      setFormData({ name: '', description: '', categoryId: '', active: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'products');
    }
  };

  const handleAddVariation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variationModalProduct || !variationFormData.variationName) return;

    try {
      await addDoc(collection(db, 'variations'), {
        ...variationFormData,
        productId: variationModalProduct.id,
        costPrice: 0 // Default
      });
      setVariationFormData({ variationName: '', salePrice: 0, stock: 0, imageUrl: '', active: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'variations');
    }
  };

  const handleDeleteVariation = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'variations', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `variations/${id}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza? Isso excluirá o produto e todas as suas variações.')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-4xl uppercase tracking-tighter text-white">Produtos</h2>
        <button 
          onClick={() => {
            setEditingProduct(null);
            setFormData({ name: '', description: '', categoryId: '', active: true });
            setIsModalOpen(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Novo Produto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div key={product.id} className="bg-surface rounded-[32px] border border-border overflow-hidden flex flex-col group hover:border-primary/50 transition-all">
            <div className="p-6 flex-grow space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
                    {categories.find(c => c.id === product.categoryId)?.name || 'Sem Categoria'}
                  </span>
                  <h3 className="font-bold text-xl mt-3 text-white group-hover:text-primary transition-colors">{product.name}</h3>
                </div>
                <div className={`w-3 h-3 rounded-full ${product.active ? 'bg-secondary shadow-[0_0_10px_rgba(0,255,0,0.5)]' : 'bg-red-500'}`} />
              </div>
              <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{product.description}</p>
            </div>
            <div className="p-4 bg-surface-hover border-t border-border flex items-center justify-between">
              <button 
                onClick={() => setVariationModalProduct(product)}
                className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-gray-500 hover:text-primary transition-colors"
              >
                <Layers size={14} />
                Variações
              </button>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setEditingProduct(product);
                    setFormData({
                      name: product.name,
                      description: product.description,
                      categoryId: product.categoryId,
                      active: product.active
                    });
                    setIsModalOpen(true);
                  }}
                  className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-xl transition-colors"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(product.id)}
                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-[40px] border border-border w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-border flex items-center justify-between">
              <h3 className="font-display text-2xl uppercase tracking-tight text-white">
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-surface-hover rounded-full text-gray-500">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Nome do Produto</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-4 rounded-2xl bg-background border border-border outline-none focus:border-primary transition-all text-white placeholder:text-gray-700"
                  placeholder="Ex: PoD Ignite V15"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Categoria</label>
                <select 
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full p-4 rounded-2xl bg-background border border-border outline-none focus:border-primary transition-all text-white appearance-none"
                  required
                >
                  <option value="">Selecione uma categoria...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Descrição</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-4 rounded-2xl bg-background border border-border outline-none focus:border-primary transition-all h-32 resize-none text-white placeholder:text-gray-700"
                  placeholder="Detalhes do produto..."
                />
              </div>
              <div className="flex items-center gap-3 ml-1">
                <input 
                  type="checkbox" 
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  id="active"
                  className="w-5 h-5 accent-primary bg-background border-border rounded"
                />
                <label htmlFor="active" className="text-sm font-bold text-white">Produto Ativo</label>
              </div>
              <button type="submit" className="w-full btn-primary py-5 text-lg uppercase tracking-widest font-display rounded-2xl">
                {editingProduct ? 'Salvar Alterações' : 'Criar Produto'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Variations Modal */}
      {variationModalProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-[40px] border border-border w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-8 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-display text-2xl uppercase tracking-tight text-white">Variações</h3>
                <p className="text-sm text-gray-500 font-bold">{variationModalProduct.name}</p>
              </div>
              <button onClick={() => setVariationModalProduct(null)} className="p-2 hover:bg-surface-hover rounded-full text-gray-500">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            
            <div className="flex-grow overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <h4 className="font-black uppercase tracking-widest text-[10px] text-primary">Adicionar Variação</h4>
                <form onSubmit={handleAddVariation} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Nome (Sabor)</label>
                    <input 
                      type="text" 
                      value={variationFormData.variationName}
                      onChange={(e) => setVariationFormData({ ...variationFormData, variationName: e.target.value })}
                      className="w-full p-4 rounded-2xl bg-background border border-border outline-none focus:border-primary transition-all text-white placeholder:text-gray-700"
                      placeholder="Ex: Uva"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Preço de Venda</label>
                      <input 
                        type="number" 
                        value={variationFormData.salePrice}
                        onChange={(e) => setVariationFormData({ ...variationFormData, salePrice: Number(e.target.value) })}
                        className="w-full p-4 rounded-2xl bg-background border border-border outline-none focus:border-primary transition-all text-white"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Estoque</label>
                      <input 
                        type="number" 
                        value={variationFormData.stock}
                        onChange={(e) => setVariationFormData({ ...variationFormData, stock: Number(e.target.value) })}
                        className="w-full p-4 rounded-2xl bg-background border border-border outline-none focus:border-primary transition-all text-white"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">URL da Imagem</label>
                    <input 
                      type="text" 
                      value={variationFormData.imageUrl}
                      onChange={(e) => setVariationFormData({ ...variationFormData, imageUrl: e.target.value })}
                      className="w-full p-4 rounded-2xl bg-background border border-border outline-none focus:border-primary transition-all text-white placeholder:text-gray-700"
                      placeholder="https://..."
                    />
                  </div>
                  <button type="submit" className="w-full btn-primary py-4 rounded-2xl font-bold uppercase tracking-widest text-sm">Adicionar Variação</button>
                </form>
              </div>

              <div className="space-y-8">
                <h4 className="font-black uppercase tracking-widest text-[10px] text-primary">Variações Existentes</h4>
                <div className="space-y-4">
                  {productVariations.map(v => (
                    <div key={v.id} className="flex items-center gap-4 p-4 bg-surface-hover rounded-[24px] border border-border group hover:border-primary/30 transition-all">
                      <div className="relative w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 border border-border">
                        <Image src={v.imageUrl || 'https://picsum.photos/seed/pod/100/100'} alt={v.variationName} fill className="object-cover" />
                      </div>
                      <div className="flex-grow">
                        <p className="font-bold text-white group-hover:text-primary transition-colors">{v.variationName}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">R$ {v.salePrice.toFixed(2)} • {v.stock} UN</p>
                      </div>
                      <button onClick={() => handleDeleteVariation(v.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  {productVariations.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-border rounded-[32px]">
                      <p className="text-sm text-gray-600 font-bold uppercase tracking-widest">Nenhuma variação cadastrada.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

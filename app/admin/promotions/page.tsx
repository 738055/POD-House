'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Plus, Trash2, Edit2, Percent, Calendar } from 'lucide-react';

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    discountType: 'PERCENTUAL',
    discountValue: 0,
    dayOfWeek: -1,
    active: true,
    productIds: [] as string[]
  });

  useEffect(() => {
    const q = query(collection(db, 'promotions'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPromotions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'promotions'));

    const qProd = query(collection(db, 'products'), orderBy('name'));
    const unsubscribeProd = onSnapshot(qProd, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'products'));

    return () => {
      unsubscribe();
      unsubscribeProd();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.discountValue <= 0) return;

    try {
      if (editingPromotion) {
        await updateDoc(doc(db, 'promotions', editingPromotion.id), formData);
      } else {
        await addDoc(collection(db, 'promotions'), {
          ...formData,
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setEditingPromotion(null);
      setFormData({ name: '', discountType: 'PERCENTUAL', discountValue: 0, dayOfWeek: -1, active: true, productIds: [] });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'promotions');
    }
  };

  const toggleProduct = (productId: string) => {
    setFormData(prev => {
      const productIds = prev.productIds.includes(productId)
        ? prev.productIds.filter(id => id !== productId)
        : [...prev.productIds, productId];
      return { ...prev, productIds };
    });
  };

  const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-4xl uppercase tracking-tighter text-white">Promoções</h2>
        <button 
          onClick={() => {
            setEditingPromotion(null);
            setFormData({ name: '', discountType: 'PERCENTUAL', discountValue: 0, dayOfWeek: -1, active: true, productIds: [] });
            setIsModalOpen(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Nova Promoção
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {promotions.map((promo) => (
          <div key={promo.id} className="bg-surface p-8 rounded-[32px] border border-border space-y-6 group hover:border-primary/50 transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-primary/10 text-primary rounded-2xl shadow-[0_0_15px_rgba(255,215,0,0.1)]">
                  <Percent size={28} />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-white group-hover:text-primary transition-colors">{promo.name}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mt-1">
                    {promo.discountType === 'PERCENTUAL' ? `${promo.discountValue}% OFF` : `R$ ${promo.discountValue} OFF`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setEditingPromotion(promo);
                    setFormData({
                      name: promo.name,
                      discountType: promo.discountType,
                      discountValue: promo.discountValue,
                      dayOfWeek: promo.dayOfWeek,
                      active: promo.active,
                      productIds: promo.productIds || []
                    });
                    setIsModalOpen(true);
                  }}
                  className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-xl transition-colors"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => deleteDoc(doc(db, 'promotions', promo.id))}
                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 bg-background/50 p-3 rounded-xl border border-border/50">
              <Calendar size={14} className="text-primary" />
              <span>{promo.dayOfWeek === -1 ? 'Todos os dias' : `Toda ${DAYS[promo.dayOfWeek]}`}</span>
            </div>

            <div className="pt-6 border-t border-border">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-3 ml-1">Produtos Aplicáveis</p>
              <div className="flex flex-wrap gap-2">
                {promo.productIds?.map((pid: string) => (
                  <span key={pid} className="text-[10px] font-bold bg-background border border-border px-3 py-1.5 rounded-full text-gray-400">
                    {products.find(p => p.id === pid)?.name || 'Produto Excluído'}
                  </span>
                ))}
                {(!promo.productIds || promo.productIds.length === 0) && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-700 italic">Nenhum produto selecionado</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-[40px] border border-border w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-border flex items-center justify-between">
              <h3 className="font-display text-2xl uppercase tracking-tight text-white">
                {editingPromotion ? 'Editar Promoção' : 'Nova Promoção'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-surface-hover rounded-full text-gray-500">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Nome da Promoção</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-4 rounded-2xl bg-background border border-border outline-none focus:border-primary transition-all text-white placeholder:text-gray-700"
                      placeholder="Ex: Quinta do Pod"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Tipo</label>
                      <select 
                        value={formData.discountType}
                        onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                        className="w-full p-4 rounded-2xl bg-background border border-border outline-none focus:border-primary transition-all text-white appearance-none"
                      >
                        <option value="PERCENTUAL">Percentual (%)</option>
                        <option value="VALOR_FIXO">Valor Fixo (R$)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Valor</label>
                      <input 
                        type="number" 
                        value={formData.discountValue}
                        onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                        className="w-full p-4 rounded-2xl bg-background border border-border outline-none focus:border-primary transition-all text-white"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Dia da Semana</label>
                    <select 
                      value={formData.dayOfWeek}
                      onChange={(e) => setFormData({ ...formData, dayOfWeek: Number(e.target.value) })}
                      className="w-full p-4 rounded-2xl bg-background border border-border outline-none focus:border-primary transition-all text-white appearance-none"
                    >
                      <option value="-1">Todos os dias</option>
                      {DAYS.map((day, idx) => (
                        <option key={idx} value={idx}>{day}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Produtos Aplicáveis</label>
                  <div className="bg-background border border-border rounded-2xl p-4 h-64 overflow-y-auto space-y-2 custom-scrollbar">
                    {products.map(p => (
                      <label key={p.id} className="flex items-center gap-3 p-3 hover:bg-surface-hover rounded-xl cursor-pointer transition-all group">
                        <input 
                          type="checkbox" 
                          checked={formData.productIds.includes(p.id)}
                          onChange={() => toggleProduct(p.id)}
                          className="w-5 h-5 accent-primary bg-background border-border rounded"
                        />
                        <span className="text-sm font-bold text-gray-400 group-hover:text-white transition-colors">{p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full btn-primary py-5 text-lg uppercase tracking-widest font-display rounded-2xl">
                {editingPromotion ? 'Salvar Alterações' : 'Criar Promoção'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

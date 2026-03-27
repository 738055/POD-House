'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'categories'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'categories'));

    return () => unsubscribe();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;

    try {
      await addDoc(collection(db, 'categories'), {
        name: newCategory,
        active: true
      });
      setNewCategory('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'categories');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return;
    try {
      await updateDoc(doc(db, 'categories', id), { name: editingName });
      setEditingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `categories/${id}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;
    try {
      await deleteDoc(doc(db, 'categories', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `categories/${id}`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-4xl uppercase tracking-tighter text-white">Categorias</h2>
      </div>

      <form onSubmit={handleAdd} className="bg-surface p-6 rounded-[32px] border border-border flex gap-4">
        <input 
          type="text" 
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="Nome da nova categoria..."
          className="flex-grow p-4 rounded-2xl bg-background border border-border outline-none focus:border-primary transition-all text-sm placeholder:text-gray-600"
        />
        <button type="submit" className="btn-primary flex items-center gap-2">
          <Plus size={20} />
          Adicionar
        </button>
      </form>

      <div className="bg-surface rounded-[32px] border border-border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-surface-hover border-b border-border">
            <tr>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Nome</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Status</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-surface-hover transition-colors group">
                <td className="p-6">
                  {editingId === cat.id ? (
                    <input 
                      type="text" 
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="w-full p-3 rounded-xl bg-background border border-primary outline-none text-white"
                      autoFocus
                    />
                  ) : (
                    <span className="font-bold text-white group-hover:text-primary transition-colors">{cat.name}</span>
                  )}
                </td>
                <td className="p-6">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${cat.active ? 'bg-secondary/10 text-secondary' : 'bg-red-500/10 text-red-500'}`}>
                    {cat.active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="p-6 text-right space-x-2">
                  {editingId === cat.id ? (
                    <>
                      <button onClick={() => handleUpdate(cat.id)} className="p-2 text-secondary hover:bg-secondary/10 rounded-xl transition-colors">
                        <Save size={18} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-2 text-gray-500 hover:bg-surface rounded-xl transition-colors">
                        <X size={18} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => {
                          setEditingId(cat.id);
                          setEditingName(cat.name);
                        }} 
                        className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-xl transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(cat.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

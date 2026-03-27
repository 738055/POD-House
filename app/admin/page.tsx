'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ShoppingBag, Users, TrendingUp, Package } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    orders: 0,
    clients: 0,
    products: 0,
    revenue: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      const ordersSnap = await getDocs(collection(db, 'orders'));
      const clientsSnap = await getDocs(collection(db, 'users'));
      const productsSnap = await getDocs(collection(db, 'products'));

      const revenue = ordersSnap.docs.reduce((sum, doc) => sum + (doc.data().total || 0), 0);

      setStats({
        orders: ordersSnap.size,
        clients: clientsSnap.size,
        products: productsSnap.size,
        revenue
      });
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-4xl uppercase tracking-tighter text-white">Dashboard</h2>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Visão geral da sua loja</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          title="Pedidos" 
          value={stats.orders} 
          icon={<ShoppingBag size={24} />} 
          color="text-blue-400 bg-blue-400/10" 
        />
        <StatCard 
          title="Clientes" 
          value={stats.clients} 
          icon={<Users size={24} />} 
          color="text-secondary bg-secondary/10" 
        />
        <StatCard 
          title="Produtos" 
          value={stats.products} 
          icon={<Package size={24} />} 
          color="text-purple-400 bg-purple-400/10" 
        />
        <StatCard 
          title="Faturamento" 
          value={`R$ ${stats.revenue.toFixed(2)}`} 
          icon={<TrendingUp size={24} />} 
          color="text-primary bg-primary/10" 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-surface p-8 rounded-[32px] border border-border group hover:border-primary/30 transition-all">
          <h3 className="font-bold text-xl text-white mb-6 group-hover:text-primary transition-colors">Últimos Pedidos</h3>
          <div className="text-center py-12 border-2 border-dashed border-border rounded-[24px]">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-700">Nenhum pedido recente encontrado.</p>
          </div>
        </div>
        <div className="bg-surface p-8 rounded-[32px] border border-border group hover:border-primary/30 transition-all">
          <h3 className="font-bold text-xl text-white mb-6 group-hover:text-primary transition-colors">Produtos Mais Vendidos</h3>
          <div className="text-center py-12 border-2 border-dashed border-border rounded-[24px]">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-700">Nenhum dado disponível.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: string | number, icon: React.ReactNode, color: string }) {
  return (
    <div className="bg-surface p-6 rounded-[32px] border border-border flex items-center gap-5 group hover:border-primary/50 transition-all">
      <div className={`${color} p-5 rounded-2xl transition-transform group-hover:scale-110 duration-300`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">{title}</p>
        <p className="text-2xl font-bold text-white group-hover:text-primary transition-colors">{value}</p>
      </div>
    </div>
  );
}

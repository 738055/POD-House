'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Package, Tag, Percent, MapPin, Ticket, ClipboardList, ArrowLeft, LogOut } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) router.push('/');
  }, [user, isAdmin, loading, router]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-900 text-white font-bold text-2xl animate-pulse">POD HOUSE...</div>;
  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex-col hidden md:flex">
        <div className="p-6 border-b border-gray-800">
          <h1 className="font-bold text-xl text-white">Admin</h1>
          <p className="text-xs text-gray-400 uppercase tracking-widest mt-0.5">Pod House Delivery</p>
        </div>
        <nav className="flex-grow p-4 space-y-1">
          {[
            { href: '/admin',               icon: LayoutDashboard, label: 'Dashboard' },
            { href: '/admin/categories',    icon: Tag,             label: 'Categorias' },
            { href: '/admin/products',      icon: Package,         label: 'Produtos' },
            { href: '/admin/promotions',    icon: Percent,         label: 'Promoções' },
            { href: '/admin/neighborhoods', icon: MapPin,          label: 'Bairros & Frete' },
            { href: '/admin/coupons',       icon: Ticket,          label: 'Cupons' },
            { href: '/admin/orders',        icon: ClipboardList,   label: 'Pedidos' },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-sm font-medium">
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800 space-y-1">
          <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 text-sm font-medium">
            <ArrowLeft size={18} /> Voltar para Loja
          </Link>
          <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 text-sm font-medium">
            <LogOut size={18} /> Sair
          </button>
        </div>
      </aside>
      <main className="flex-grow overflow-y-auto p-6 md:p-10 bg-gray-950 text-white">
        {children}
      </main>
    </div>
  );
}

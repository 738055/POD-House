'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Package, Tag, Percent, ArrowLeft, LogOut } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push('/');
    }
  }, [user, isAdmin, loading, router]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-background text-primary font-display text-2xl animate-pulse">POD HOUSE...</div>;
  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-72 bg-surface border-r border-border flex flex-col hidden md:flex">
        <div className="p-10 border-b border-border">
          <h1 className="font-display text-3xl uppercase tracking-tighter text-white">Admin</h1>
          <p className="text-[10px] text-primary uppercase tracking-widest font-black">Pod House Delivery</p>
        </div>

        <nav className="flex-grow p-6 space-y-3">
          <AdminNavLink href="/admin" icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <AdminNavLink href="/admin/categories" icon={<Tag size={20} />} label="Categorias" />
          <AdminNavLink href="/admin/products" icon={<Package size={20} />} label="Produtos" />
          <AdminNavLink href="/admin/promotions" icon={<Percent size={20} />} label="Promoções" />
        </nav>

        <div className="p-6 border-t border-border space-y-3">
          <Link href="/" className="flex items-center gap-4 p-4 rounded-2xl hover:bg-surface-hover transition-all text-gray-500 hover:text-white group">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest">Voltar para Loja</span>
          </Link>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-red-500/10 text-red-500 transition-all group"
          >
            <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest">Sair</span>
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-grow overflow-y-auto p-6 md:p-12">
        {children}
      </main>
    </div>
  );
}

function AdminNavLink({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) {
  return (
    <Link href={href} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-surface-hover transition-all text-gray-400 hover:text-primary group">
      <div className="text-gray-500 group-hover:text-primary transition-colors">
        {icon}
      </div>
      <span className="text-xs font-black uppercase tracking-widest">{label}</span>
    </Link>
  );
}

'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Package, Tag, Percent, MapPin, Ticket, ClipboardList, ArrowLeft, LogOut, Users, MessageCircle, CalendarDays, Menu, X } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/admin',               icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/categories',    icon: Tag,             label: 'Categorias' },
  { href: '/admin/products',      icon: Package,         label: 'Produtos' },
  { href: '/admin/promotions',    icon: Percent,         label: 'Promoções' },
  { href: '/admin/neighborhoods', icon: MapPin,          label: 'Bairros & Frete' },
  { href: '/admin/coupons',       icon: Ticket,          label: 'Cupons' },
  { href: '/admin/orders',        icon: ClipboardList,   label: 'Pedidos' },
  { href: '/admin/users',         icon: Users,           label: 'Clientes' },
  { href: '/admin/whatsapp',      icon: MessageCircle,   label: 'WhatsApp' },
  { href: '/admin/promotions/calendar', icon: CalendarDays, label: 'Calendário' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) router.push('/');
  }, [user, isAdmin, loading, router]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-900 text-white font-bold text-2xl animate-pulse">POD HOUSE...</div>;
  if (!user || !isAdmin) return null;

  const sidebar = (
    <>
      <div className="p-6 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-xl text-white">Admin</h1>
          <p className="text-xs text-gray-400 uppercase tracking-widest mt-0.5">Pod House Delivery</p>
        </div>
        <button onClick={() => setMobileOpen(false)} className="md:hidden p-2 text-gray-400 hover:text-white">
          <X size={20} />
        </button>
      </div>
      <nav className="flex-grow p-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <Link key={item.href} href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm font-medium ${
              pathname === item.href ? 'bg-purple-600/20 text-purple-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}>
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
    </>
  );

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex-col hidden md:flex">
        {sidebar}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 h-full bg-gray-900 flex flex-col">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex-grow flex flex-col">
        {/* Mobile Header */}
        <header className="md:hidden bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="p-2 text-gray-400 hover:text-white">
            <Menu size={20} />
          </button>
          <h1 className="font-bold text-white">POD House Admin</h1>
        </header>

        <main className="flex-grow overflow-y-auto p-6 md:p-10 bg-gray-950 text-white">
          {children}
        </main>
      </div>
    </div>
  );
}

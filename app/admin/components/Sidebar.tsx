'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  List,
  Users,
  ShoppingBag,
  Ticket,
  MessageSquare,
  LogOut,
  X,
  Tag,
  ChevronRight,
  Settings,
  Truck,
  Boxes,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface SidebarProps {
  setMobileOpen: (open: boolean) => void;
  signOut: () => Promise<void>;
}

const menuItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Produtos', href: '/admin/products', icon: Package },
  { name: 'Categorias', href: '/admin/categories', icon: List },
  { name: 'Pedidos', href: '/admin/orders', icon: ShoppingBag },
  { name: 'Promoções', href: '/admin/promotions', icon: Tag },
  { name: 'Cupons', href: '/admin/coupons', icon: Ticket },
  { name: 'Zonas Entrega', href: '/admin/delivery-zones', icon: Truck },
  { name: 'Estoque', href: '/admin/stock', icon: Boxes },
  { name: 'Usuários', href: '/admin/users', icon: Users },
  { name: 'WhatsApp', href: '/admin/whatsapp', icon: MessageSquare },
  { name: 'Configurações', href: '/admin/settings', icon: Settings },
];

export function Sidebar({ setMobileOpen, signOut }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-800/50">
      {/* Header */}
      <div className="h-20 flex items-center justify-between px-6 border-b border-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-900/20">
            <Image src="/logo.png" alt="Logo" width={24} height={24} className="brightness-0 invert" />
          </div>
          <span className="text-white font-black text-xl tracking-tighter">POD HOUSE</span>
        </div>
        <button 
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-all"
        >
          <X size={24} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-grow overflow-y-auto py-8 px-4 space-y-1.5 custom-scrollbar">
        <p className="px-4 mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Menu Principal</p>
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                isActive 
                  ? "bg-purple-600 text-white shadow-xl shadow-purple-900/20" 
                  : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-100"
              )}
            >
              <div className="flex items-center gap-3.5 z-10">
                <item.icon size={20} className={cn(
                  "transition-all duration-300",
                  isActive ? "scale-110" : "group-hover:scale-110 group-hover:text-purple-400"
                )} />
                <span className="font-bold text-sm tracking-tight">{item.name}</span>
              </div>
              {isActive ? (
                <div className="w-1.5 h-1.5 bg-white rounded-full z-10" />
              ) : (
                <ChevronRight size={14} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
              )}
              
              {/* Active Background Glow */}
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-purple-500 opacity-50" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / User */}
      <div className="p-4 border-t border-gray-800/50 bg-gray-900/50 backdrop-blur-sm">
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3.5 w-full px-4 py-4 rounded-2xl text-gray-400 hover:bg-red-500/10 hover:text-red-500 transition-all duration-300 group"
        >
          <div className="p-2 bg-gray-800 group-hover:bg-red-500/20 rounded-xl transition-colors">
            <LogOut size={18} />
          </div>
          <span className="font-bold text-sm">Sair da Conta</span>
        </button>
      </div>
    </div>
  );
}

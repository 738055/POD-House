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
  MapPin, 
  MessageSquare, 
  LogOut,
  X,
  Tag
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  { name: 'Bairros', href: '/admin/neighborhoods', icon: MapPin },
  { name: 'Usuários', href: '/admin/users', icon: Users },
  { name: 'WhatsApp', href: '/admin/whatsapp', icon: MessageSquare },
];

export function Sidebar({ setMobileOpen, signOut }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full text-gray-300">
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-800">
        <span className="text-white font-bold text-xl">POD HOUSE</span>
        <button 
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      <nav className="flex-grow overflow-y-auto py-6 px-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                isActive 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" 
                  : "hover:bg-gray-800 hover:text-white"
              )}
            >
              <item.icon size={20} className={cn(
                "transition-colors",
                isActive ? "text-white" : "text-gray-500 group-hover:text-white"
              )} />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-gray-400 hover:bg-red-900/20 hover:text-red-400 transition-all duration-200"
        >
          <LogOut size={20} />
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </div>
  );
}

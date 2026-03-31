'use client';

import { Menu, Bell, Search, User } from 'lucide-react';
import Image from 'next/image';

interface MobileHeaderProps {
  setMobileOpen: (open: boolean) => void;
}

export function MobileHeader({ setMobileOpen }: MobileHeaderProps) {
  return (
    <header className="h-20 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800/50 flex items-center justify-between px-6 md:hidden sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-3 bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800 rounded-2xl transition-all active:scale-90 shadow-lg shadow-black/20"
        >
          <Menu size={22} />
        </button>
        <div className="flex flex-col">
          <span className="text-white font-black text-lg tracking-tighter leading-none">POD HOUSE</span>
          <span className="text-[10px] font-bold text-purple-500 uppercase tracking-widest mt-0.5">Painel Admin</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="p-2.5 text-gray-500 hover:text-white transition-colors">
          <Search size={20} />
        </button>
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 p-[2px] shadow-lg shadow-purple-900/20">
          <div className="w-full h-full rounded-[14px] bg-gray-900 flex items-center justify-center overflow-hidden">
            <User size={20} className="text-gray-400" />
          </div>
        </div>
      </div>
    </header>
  );
}

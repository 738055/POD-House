'use client';

import { Menu } from 'lucide-react';

interface MobileHeaderProps {
  setMobileOpen: (open: boolean) => void;
}

export function MobileHeader({ setMobileOpen }: MobileHeaderProps) {
  return (
    <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center px-4 md:hidden">
      <button
        onClick={() => setMobileOpen(true)}
        className="p-2 text-gray-400 hover:text-white transition-colors"
      >
        <Menu size={24} />
      </button>
      <span className="ml-4 text-white font-bold text-lg">POD HOUSE ADMIN</span>
    </header>
  );
}

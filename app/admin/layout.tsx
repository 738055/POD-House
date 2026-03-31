'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { MobileHeader } from './components/MobileHeader';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading, signOut } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-900 text-white font-bold text-2xl animate-pulse">POD HOUSE...</div>;
  
  // O middleware já protege esta rota, mas mantemos uma verificação de segurança
  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex-col hidden md:flex">
        <Sidebar setMobileOpen={setMobileOpen} signOut={signOut} />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 h-full bg-gray-900 flex flex-col">
            <Sidebar setMobileOpen={setMobileOpen} signOut={signOut} />
          </aside>
        </div>
      )}

      <div className="flex-grow flex flex-col">
        <MobileHeader setMobileOpen={setMobileOpen} />
        <main className="flex-grow overflow-y-auto p-6 md:p-10 bg-gray-950 text-white">
          {children}
        </main>
      </div>
    </div>
  );
}

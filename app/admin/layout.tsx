'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { MobileHeader } from './components/MobileHeader';
import { ToastProvider } from '@/hooks/use-toast';
import { ToastContainer } from './components/Toast';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading, signOut } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.replace('/');
    }
  }, [user, isAdmin, loading, router]);

  // Redireciona quando carregamento finalizar sem permissão
  // Middleware já protege a rota — aqui só prevenimos flash de conteúdo
  if (!loading && (!user || !isAdmin)) return null;

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-950 flex font-sans selection:bg-purple-500/30">
        {/* Desktop Sidebar */}
        <aside className="w-72 bg-gray-900 border-r border-gray-800/50 flex-col hidden lg:flex sticky top-0 h-screen">
          <Sidebar setMobileOpen={setMobileOpen} signOut={signOut} />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-[100] lg:hidden">
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="relative w-[85%] max-w-[320px] h-full bg-gray-900 flex flex-col shadow-2xl animate-in slide-in-from-left duration-300">
              <Sidebar setMobileOpen={setMobileOpen} signOut={signOut} />
            </aside>
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <MobileHeader setMobileOpen={setMobileOpen} />
          <main className="flex-1 p-4 md:p-8 lg:p-10 bg-gray-950 text-white overflow-y-auto overflow-x-hidden">
            <div className="w-full max-w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              {children}
            </div>
          </main>
        </div>
      </div>

      <ToastContainer />
    </ToastProvider>
  );
}

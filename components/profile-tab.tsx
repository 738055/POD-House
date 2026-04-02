'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Star, ShoppingBag, Gift, MapPin, Info, ChevronRight, LogOut } from 'lucide-react';

interface ProfileTabProps {
  setActiveTab?: (tab: string) => void;
  setIsStoreInfoOpen?: (isOpen: boolean) => void;
}

export default function ProfileTab({ setActiveTab, setIsStoreInfoOpen }: ProfileTabProps = {}) {
  const { user, profile, isAdmin, signOut, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return <div className="p-4 pt-6"><div className="h-24 bg-gray-200 rounded-2xl animate-pulse"></div></div>;
  }

  return (
    <div style={{paddingBottom:'80px'}}>
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Perfil</h1>
      </div>
      <div className="px-4 space-y-3">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
            <User size={32} className="text-purple-500" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{profile?.full_name || 'Visitante'}</h3>
            <p className="text-gray-500 text-sm">{user ? user.email : 'Faça login para acessar sua conta'}</p>
          </div>
        </div>

        {!user ? (
          <div className="space-y-2">
            <button onClick={() => router.push('/login')} className="w-full bg-purple-600 text-white font-bold py-4 rounded-xl hover:bg-purple-700 transition-colors">
              Entrar / Cadastrar
            </button>
            <Link href="/forgot-password" className="block text-center text-sm text-purple-600 hover:underline py-1">
              Esqueceu a senha?
            </Link>
          </div>
        ) : (
          isAdmin && (
            <button onClick={() => router.push('/admin')} className="w-full bg-gray-800 text-white font-bold py-4 rounded-xl hover:bg-gray-900 transition-colors">
              Painel do Administrador
            </button>
          )
        )}

        <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-3 mb-3"><Star size={24} className="text-yellow-300" /><h3 className="font-bold text-lg">Programa de Fidelidade</h3></div>
          <p className="text-purple-200 text-sm mb-4">A cada <strong className="text-white">R$ 1,00</strong> em compras você ganha <strong className="text-white">1 ponto</strong>.</p>
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{profile?.points_balance ?? 0} pontos</p>
            {!user && <p className="text-purple-200 text-xs mt-1">Faça login para ver seus pontos</p>}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {[
            { icon: ShoppingBag, label: 'Meus Pedidos', action: () => setActiveTab ? setActiveTab('pedidos') : router.push('/pedidos') },
            { icon: Gift, label: 'Cupons Disponíveis', action: () => router.push('/cupons') },
            { icon: MapPin, label: 'Meus Endereços', action: () => router.push('/enderecos') },
            { icon: Info, label: 'Sobre a Loja', action: () => setIsStoreInfoOpen ? setIsStoreInfoOpen(true) : router.push('/sobre') },
          ].map((item, index, arr) => (
            <button key={item.label} onClick={item.action} className={`w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors ${index < arr.length - 1 ? 'border-b border-gray-100' : ''}`}>
              <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center"><item.icon size={18} className="text-purple-600" /></div>
              <span className="font-medium text-gray-800 flex-1 text-left">{item.label}</span>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
          ))}
        </div>

        {user && (
          <button onClick={signOut} className="w-full text-red-500 font-medium py-3 rounded-xl hover:bg-red-50 transition-colors">
            <LogOut size={18} className="inline-block mr-2" /> Sair da conta
          </button>
        )}
      </div>
    </div>
  );
}
'use client';

import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import type { User, Session, SupabaseClient } from '@supabase/supabase-js';

// Tipagem para o perfil do usuário, baseado no seu schema SQL
type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: 'client' | 'admin';
  points_balance: number;
};

// Tipagem para o valor do contexto de autenticação
type AuthContextType = {
  supabase: SupabaseClient;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
};

// Cria o contexto com um valor inicial indefinido
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = async () => {
    await supabase.auth.signOut();
    // O listener onAuthStateChange cuidará de limpar o estado
  };

  useEffect(() => {
    // Função para buscar a sessão e o perfil inicial
    const getInitialSession = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setProfile(userProfile as Profile | null);
      } else {
        setProfile(null); // Limpa o perfil se não houver sessão
      }
      setLoading(false);
    };

    getInitialSession();

    // Listener para mudanças no estado de autenticação (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      getInitialSession();
    });

    // Limpa a inscrição quando o componente é desmontado
    return () => subscription.unsubscribe();
  }, [supabase]);

  const value = {
    supabase,
    session,
    user,
    profile,
    isAdmin: profile?.role === 'admin',
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook customizado para facilitar o uso do contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session, SupabaseClient } from '@supabase/supabase-js';

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: 'client' | 'admin';
  points_balance: number;
};

type AuthContextType = {
  supabase: SupabaseClient;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string): Promise<Profile | null> {
    const fetchPromise = supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
      .then(({ data, error }) => {
        if (error && error.code !== 'PGRST116') { // Ignora log se o erro for apenas "linha não encontrada"
          console.error('Erro na query do perfil:', error.message);
        }
        return data ? (data as Profile) : null;
      })
      .catch(() => null);

    // Timeout de segurança: se o Supabase não responder em 15s, continua sem perfil
    const timeoutPromise = new Promise<null>(resolve =>
      setTimeout(() => resolve(null), 15000)
    );

    return Promise.race([fetchPromise, timeoutPromise]);
  }

  // Exposto para forçar reload do perfil quando necessário (ex: edição de dados)
  const refreshSession = useCallback(async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    setSession(s);
    setUser(s?.user ?? null);
    if (s?.user) {
      const p = await fetchProfile(s.user.id);
      setProfile(p);
    } else {
      setProfile(null);
    }
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    // INITIAL_SESSION é disparado de forma síncrona pelo Supabase ao registrar o listener,
    // com a sessão atual em memória/cookies — sem chamadas de rede. Isso garante que
    // o loading seja resolvido mesmo se o token precisar ser renovado posteriormente.
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        try {
          if (event === 'SIGNED_OUT') {
            setSession(null);
            setUser(null);
            setProfile(null);
            return;
          }

          setSession(newSession);
          setUser(newSession?.user ?? null);

          if (newSession?.user && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
            const p = await fetchProfile(newSession.user.id);
            if (mounted) setProfile(p);
          } else if (!newSession?.user) {
            setProfile(null);
          }
        } catch {
          // Se fetchProfile falhar, continua sem profile — o layout vai redirecionar
        } finally {
          // Libera o loading apenas no evento inicial (sempre disparado no mount)
          if (event === 'INITIAL_SESSION' && mounted) {
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    supabase,
    session,
    user,
    profile,
    isAdmin: profile?.role === 'admin',
    loading,
    signOut,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
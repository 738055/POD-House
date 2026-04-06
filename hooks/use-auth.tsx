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
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return data as Profile | null;
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

    // Busca a sessão inicial manualmente. Evita o bug de "loading infinito"
    // no refresh da página, garantindo que o estado não dependa apenas do evento.
    async function initSession() {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (!mounted) return;
        
        setSession(s);
        setUser(s?.user ?? null);

        if (s?.user) {
          const p = await fetchProfile(s.user.id);
          if (mounted) setProfile(p);
        }
      } catch (error) {
        console.error('Erro ao inicializar sessão:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted || event === 'INITIAL_SESSION') return;

        try {
          if (event === 'SIGNED_OUT') {
            setSession(null);
            setUser(null);
            setProfile(null);
            return;
          }

          setSession(newSession);
          setUser(newSession?.user ?? null);

          if (newSession?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
            const p = await fetchProfile(newSession.user.id);
            if (mounted) setProfile(p);
          }
        } catch {
          // Se fetchProfile falhar, continua sem profile — o layout vai redirecionar
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
    isAdmin: 
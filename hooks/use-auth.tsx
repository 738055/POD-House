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

  const refreshSession = useCallback(async (currentSession?: Session | null) => {
    try {
      let activeSession = currentSession;
      if (activeSession === undefined) {
        const { data: { session: fetchedSession }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        activeSession = fetchedSession;
      }

      setSession(activeSession ?? null);
      setUser(activeSession?.user ?? null);

      if (activeSession?.user) {
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', activeSession.user.id)
          .single();
        
        if (profileError) {
          console.error('Error fetching profile:', profileError.message);
          setProfile(null);
        } else {
          setProfile(userProfile as Profile | null);
        }
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('Auth refresh error:', error);
      setSession(null);
      setUser(null);
      setProfile(null);
    } finally {
      // O 'finally' garante que o loading termine independente de sucesso ou erro!
      setLoading(false); 
    }
  }, [supabase]);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      await refreshSession(initialSession);
    };
    
    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth event:', event);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          await refreshSession(newSession);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, refreshSession]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
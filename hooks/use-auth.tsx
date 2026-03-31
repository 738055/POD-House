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

  const refreshSession = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw sessionError;
      }

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentSession.user.id)
          .single();
        
        if (profileError) {
          // It's possible the profile doesn't exist yet, so don't throw an error
          console.error('Error fetching profile:', profileError.message);
          setProfile(null);
        } else {
          setProfile(userProfile as Profile | null);
        }
      } else {
        setProfile(null);
      }
    } catch (e) {
      console.error('Error refreshing session:', e);
      // Clear session data on critical error
      setSession(null);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    // Initial fetch
    refreshSession();

    // Set up a listener for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);
        // We only need to refresh the session details, which includes the profile
        // The getSession call in refreshSession is the source of truth
        await refreshSession();
      }
    );

    // Clean up the listener on unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, refreshSession]);

  const signOut = async () => {
    await supabase.auth.signOut();
    // Clear local state immediately
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
    refreshSession, // Expose the refresh function
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
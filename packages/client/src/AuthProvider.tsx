import React, {createContext, useContext, useEffect, useState} from 'react';
import type {Session, SupabaseClient} from '@supabase/supabase-js';

type AuthContextValue = {session: Session | null; isLoading: boolean};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

type AuthProviderProps = {supabase: SupabaseClient; children: React.ReactNode};

export const AuthProvider = ({supabase, children}: AuthProviderProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void supabase.auth.getSession().then(({data}) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const {data: listener} = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <AuthContext.Provider value={{session, isLoading}}>
      {children}
    </AuthContext.Provider>
  );
};

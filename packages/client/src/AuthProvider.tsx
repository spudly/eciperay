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
  const [auth, setAuth] = useState<AuthContextValue>({
    session: null,
    isLoading: true,
  });

  useEffect(() => {
    void supabase.auth.getSession().then(({data}) => {
      setAuth({session: data.session, isLoading: false});
    });

    const {data: listener} = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setAuth(prev => ({...prev, session}));
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

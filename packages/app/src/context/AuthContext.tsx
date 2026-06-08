import React, {createContext, useContext, useEffect, useState} from 'react';
import type {Session} from '@supabase/supabase-js';

import {supabase} from '../lib/supabase';

type AuthContextValue = {session: Session | null; isLoading: boolean};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({children}: {children: React.ReactNode}) => {
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
  }, []);

  return (
    <AuthContext.Provider value={{session, isLoading}}>
      {children}
    </AuthContext.Provider>
  );
};

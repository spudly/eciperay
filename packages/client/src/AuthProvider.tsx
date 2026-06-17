import React, {createContext, useContext, useEffect, useState} from 'react';
import type {Session, SupabaseClient} from '@supabase/supabase-js';

type AuthContextValue = {session: Session | null; isLoading: boolean};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

type AuthProviderProps = {
  supabase: SupabaseClient;
  children: React.ReactNode;
  onAuthenticated?: (session: Session) => Promise<void>;
};

const subscribeSupabaseAuth = (
  supabase: SupabaseClient,
  setAuth: React.Dispatch<React.SetStateAction<AuthContextValue>>,
  onAuthenticated?: (session: Session) => Promise<void>,
) => {
  void supabase.auth
    .getSession()
    .then(async ({data}) => {
      setAuth({session: data.session, isLoading: false});
      if (data.session) {
        await onAuthenticated?.(data.session);
      }
    })
    .catch(() => {
      setAuth({session: null, isLoading: false});
    });

  const {data: listener} = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setAuth(prev => ({...prev, session}));
      if (session) {
        void onAuthenticated?.(session);
      }
    },
  );

  return () => {
    listener.subscription.unsubscribe();
  };
};

const useSupabaseAuth = (
  supabase: SupabaseClient,
  onAuthenticated?: (session: Session) => Promise<void>,
): AuthContextValue => {
  const [auth, setAuth] = useState<AuthContextValue>({
    session: null,
    isLoading: true,
  });

  useEffect(() => {
    return subscribeSupabaseAuth(supabase, setAuth, onAuthenticated);
  }, [supabase, onAuthenticated]);

  return auth;
};

export const AuthProvider = ({
  supabase,
  children,
  onAuthenticated,
}: AuthProviderProps) => {
  const auth = useSupabaseAuth(supabase, onAuthenticated);
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

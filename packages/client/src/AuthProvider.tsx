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
  onSignedOut?: () => Promise<void> | void;
};

const applyAuthSessionChange = (
  prev: AuthContextValue,
  session: Session | null,
  onSignedOut?: () => Promise<void> | void,
): AuthContextValue => {
  if (prev.session && !session) {
    void onSignedOut?.();
  }
  return {...prev, session};
};

const subscribeSupabaseAuth = (
  supabase: SupabaseClient,
  setAuth: React.Dispatch<React.SetStateAction<AuthContextValue>>,
  onAuthenticated?: (session: Session) => Promise<void>,
  onSignedOut?: () => Promise<void> | void,
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
      setAuth(prev => applyAuthSessionChange(prev, session, onSignedOut));
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
  onSignedOut?: () => Promise<void> | void,
): AuthContextValue => {
  const [auth, setAuth] = useState<AuthContextValue>({
    session: null,
    isLoading: true,
  });

  useEffect(() => {
    return subscribeSupabaseAuth(
      supabase,
      setAuth,
      onAuthenticated,
      onSignedOut,
    );
  }, [supabase, onAuthenticated, onSignedOut]);

  return auth;
};

export const AuthProvider = ({
  supabase,
  children,
  onAuthenticated,
  onSignedOut,
}: AuthProviderProps) => {
  const auth = useSupabaseAuth(supabase, onAuthenticated, onSignedOut);
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

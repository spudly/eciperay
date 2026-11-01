import React, {createContext, useContext, useEffect, useState} from 'react';
import type {Session, SupabaseClient} from '@supabase/supabase-js';

type AuthContextValue = {session: Session | null; isLoading: boolean};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

/**
 * Marks an `onAuthenticated` rejection as a deliberate end of the session: the
 * lifecycle rejected the session's token and its recovery sign-out failed, so
 * no SIGNED_OUT event is coming and AuthProvider must drop the session itself.
 * Lifecycles throw this ONLY for that failed token-rejection recovery. Any
 * other rejection is an ordinary sync failure (e.g. a transient 503 from the
 * sync endpoint): the provider session is still valid, so AuthProvider
 * preserves it and does not run signed-out cleanup; the lifecycle that raised
 * it reports the error.
 */
export class AuthSessionRejectedError extends Error {
  constructor(message: string, options?: {cause?: unknown}) {
    super(message, options);
    this.name = 'AuthSessionRejectedError';
  }
}

export const isAuthSessionRejectedError = (error: unknown): boolean =>
  error instanceof AuthSessionRejectedError;

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
  void (async () => {
    let restoredSession: Session | null;
    try {
      const {data} = await supabase.auth.getSession();
      restoredSession = data.session;
    } catch {
      setAuth({session: null, isLoading: false});
      return;
    }
    setAuth({session: restoredSession, isLoading: false});
    if (!restoredSession) {
      return;
    }
    try {
      await onAuthenticated?.(restoredSession);
    } catch (error) {
      // Only a failed token-rejection recovery ends the restored session;
      // an ordinary sync failure leaves the still-valid session in place.
      if (isAuthSessionRejectedError(error)) {
        setAuth({session: null, isLoading: false});
      }
    }
  })();

  const {data: listener} = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setAuth(prev => applyAuthSessionChange(prev, session, onSignedOut));
      if (session) {
        void Promise.resolve(onAuthenticated?.(session)).catch(
          (error: unknown) => {
            if (!isAuthSessionRejectedError(error)) {
              // Ordinary sync failure (e.g. a transient 503 during
              // TOKEN_REFRESHED): the provider still holds this valid
              // session, so preserve it and skip signed-out cleanup. The
              // lifecycle reports the error; swallowing it here keeps it
              // from becoming an unhandled rejection.
              return;
            }
            // The lifecycle rejected this session's token and its
            // recovery sign-out itself failed, so no SIGNED_OUT event is
            // coming. Drop the session rather than leaving a stale
            // authenticated state — unless a newer session has since
            // replaced the one that failed.
            setAuth(prev => {
              if (prev.session?.access_token !== session.access_token) {
                return prev;
              }
              return applyAuthSessionChange(prev, null, onSignedOut);
            });
          },
        );
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

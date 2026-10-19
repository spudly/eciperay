import {useEffect, useState} from 'react';
import {Alert, Linking} from 'react-native';
import type {SupabaseClient} from '@supabase/supabase-js';
import {errorMessage} from '@eciperay/client';

import {
  createSessionFromAuthDeepLink,
  isAuthDeepLinkUrl,
} from '../lib/authDeepLink';

type AuthDeepLinkState = {
  needsPasswordReset: boolean;
  clearPasswordRecovery: () => void;
};

const handleAuthDeepLinkUrl = async (
  supabase: SupabaseClient,
  url: string | null | undefined,
) => {
  if (!url || !isAuthDeepLinkUrl(url)) {
    return;
  }

  try {
    await createSessionFromAuthDeepLink(supabase, url);
  } catch (error) {
    Alert.alert('Sign in failed', errorMessage(error));
  }
};

const subscribeToPasswordRecovery = (
  supabase: SupabaseClient,
  setNeedsPasswordReset: (value: boolean) => void,
) => {
  const {
    data: {subscription},
  } = supabase.auth.onAuthStateChange(event => {
    if (event === 'PASSWORD_RECOVERY') {
      setNeedsPasswordReset(true);
    }
  });

  return () => {
    subscription.unsubscribe();
  };
};

const subscribeToAuthDeepLinks = (supabase: SupabaseClient) => {
  void Linking.getInitialURL().then(url =>
    handleAuthDeepLinkUrl(supabase, url),
  );

  const subscription = Linking.addEventListener('url', ({url}) => {
    void handleAuthDeepLinkUrl(supabase, url);
  });

  return () => {
    subscription.remove();
  };
};

export const useAuthDeepLink = (
  supabase: SupabaseClient,
): AuthDeepLinkState => {
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false);

  useEffect(
    () => subscribeToPasswordRecovery(supabase, setNeedsPasswordReset),
    [supabase],
  );

  useEffect(() => subscribeToAuthDeepLinks(supabase), [supabase]);

  return {
    needsPasswordReset,
    clearPasswordRecovery: () => {
      setNeedsPasswordReset(false);
    },
  };
};

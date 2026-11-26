import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  readFeedbackShortcutEnabled,
  writeFeedbackShortcutEnabled,
  type FeedbackShortcutStorage,
} from './feedbackPreference.js';

type FeedbackPreferenceContextValue = {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
};

const FeedbackPreferenceContext =
  createContext<FeedbackPreferenceContextValue | null>(null);

export const FeedbackPreferenceContextProvider = ({
  children,
  enabled,
  setEnabled,
}: {
  children: ReactNode;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}) => {
  const value = useMemo(() => ({enabled, setEnabled}), [enabled, setEnabled]);

  return (
    <FeedbackPreferenceContext.Provider value={value}>
      {children}
    </FeedbackPreferenceContext.Provider>
  );
};

// Web hosts that mount the provider without an injected storage keep the
// pre-#678 behavior: persist to localStorage. Platforms without a global
// localStorage (the native app) must inject their own storage — there the
// fallback is undefined and setEnabled only updates in-memory state.
const localStorageFallback: FeedbackShortcutStorage | undefined =
  typeof localStorage === 'undefined'
    ? undefined
    : {
        getItem: (key: string) => localStorage.getItem(key),
        setItem: (key: string, value: string) => {
          localStorage.setItem(key, value);
        },
        removeItem: (key: string) => {
          localStorage.removeItem(key);
        },
      };

export const FeedbackPreferenceProvider = ({
  children,
  storage,
  initialEnabled,
}: {
  children: ReactNode;
  storage?: FeedbackShortcutStorage;
  initialEnabled?: boolean;
}) => {
  const effectiveStorage = storage ?? localStorageFallback;
  const [enabled, setEnabledState] = useState(initialEnabled ?? false);

  useEffect(() => {
    if (initialEnabled !== undefined || !effectiveStorage) {
      return;
    }
    let cancelled = false;
    void readFeedbackShortcutEnabled(effectiveStorage).then(value => {
      if (!cancelled) {
        setEnabledState(value);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [initialEnabled, effectiveStorage]);

  const setEnabled = (nextEnabled: boolean) => {
    if (effectiveStorage) {
      void writeFeedbackShortcutEnabled(effectiveStorage, nextEnabled);
    }
    setEnabledState(nextEnabled);
  };

  return (
    <FeedbackPreferenceContextProvider
      enabled={enabled}
      setEnabled={setEnabled}
    >
      {children}
    </FeedbackPreferenceContextProvider>
  );
};

export const useFeedbackShortcutEnabled =
  (): FeedbackPreferenceContextValue => {
    const context = useContext(FeedbackPreferenceContext);
    if (!context) {
      throw new Error(
        'useFeedbackShortcutEnabled must be used within FeedbackPreferenceProvider',
      );
    }
    return context;
  };

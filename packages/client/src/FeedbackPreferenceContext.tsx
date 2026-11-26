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

export const FeedbackPreferenceProvider = ({
  children,
  storage,
  initialEnabled,
}: {
  children: ReactNode;
  storage?: FeedbackShortcutStorage;
  initialEnabled?: boolean;
}) => {
  const [enabled, setEnabledState] = useState(initialEnabled ?? false);

  useEffect(() => {
    if (initialEnabled !== undefined || !storage) {
      return;
    }
    let cancelled = false;
    void readFeedbackShortcutEnabled(storage).then(value => {
      if (!cancelled) {
        setEnabledState(value);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [initialEnabled, storage]);

  const setEnabled = (nextEnabled: boolean) => {
    if (storage) {
      void writeFeedbackShortcutEnabled(storage, nextEnabled);
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

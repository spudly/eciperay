import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  readFeedbackShortcutEnabled,
  writeFeedbackShortcutEnabled,
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
  initialEnabled = readFeedbackShortcutEnabled(),
}: {
  children: ReactNode;
  initialEnabled?: boolean;
}) => {
  const [enabled, setEnabledState] = useState(initialEnabled);

  const setEnabled = (nextEnabled: boolean) => {
    writeFeedbackShortcutEnabled(nextEnabled);
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

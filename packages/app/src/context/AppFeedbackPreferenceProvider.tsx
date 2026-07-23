import {FeedbackPreferenceContextProvider} from '@eciperay/client';
import {useCallback, useEffect, useState, type ReactNode} from 'react';

import {
  readFeedbackShortcutEnabled,
  writeFeedbackShortcutEnabled,
} from '../lib/feedbackPreference.js';

export const AppFeedbackPreferenceProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [enabled, setEnabledState] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void readFeedbackShortcutEnabled().then(value => {
      setEnabledState(value);
      setReady(true);
    });
  }, []);

  const setEnabled = useCallback((nextEnabled: boolean) => {
    void writeFeedbackShortcutEnabled(nextEnabled).then(() => {
      setEnabledState(nextEnabled);
    });
  }, []);

  if (!ready) {
    return (
      <FeedbackPreferenceContextProvider
        enabled={false}
        setEnabled={setEnabled}
      >
        {children}
      </FeedbackPreferenceContextProvider>
    );
  }

  return (
    <FeedbackPreferenceContextProvider
      enabled={enabled}
      setEnabled={setEnabled}
    >
      {children}
    </FeedbackPreferenceContextProvider>
  );
};

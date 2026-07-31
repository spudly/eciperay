import {
  identifyAnalyticsUser,
  readAnalyticsConsent,
  useAuth,
  writeAnalyticsConsent,
} from '@eciperay/client';
import {useState} from 'react';
import {Link} from 'react-router-dom';

import {analytics, enablePostHog} from '../lib/analytics.js';
import {POSTHOG_KEY} from '../lib/env.js';

import {FixedActionBanner} from './ui/FixedActionBanner.js';

const shouldPromptForConsent = () =>
  POSTHOG_KEY.length > 0 && readAnalyticsConsent() === null;

export const AnalyticsConsentBanner = () => {
  const {session} = useAuth();
  const [visible, setVisible] = useState(shouldPromptForConsent);

  if (!visible) {
    return null;
  }

  const accept = () => {
    writeAnalyticsConsent('accepted');
    enablePostHog();
    if (session) {
      identifyAnalyticsUser(analytics, session);
    }
    setVisible(false);
  };

  const decline = () => {
    writeAnalyticsConsent('declined');
    setVisible(false);
  };

  return (
    <FixedActionBanner
      position="bottom"
      ariaLabel="Cookie and analytics consent"
      role="dialog"
      message={
        <>
          We use cookies and product analytics to improve Eciperay. See our{' '}
          <Link
            to="/privacy"
            className="text-primary font-medium underline"
          >
            Privacy Policy
          </Link>{' '}
          for details.
        </>
      }
      secondaryAction={{label: 'Decline', onPress: decline}}
      primaryAction={{label: 'Accept', onPress: accept}}
    />
  );
};

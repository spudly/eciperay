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
    <div
      className="
        fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white p-4
        shadow-lg
      "
      role="dialog"
      aria-label="Cookie and analytics consent"
    >
      <div
        className="
          mx-auto flex max-w-5xl flex-col gap-3
          sm:flex-row sm:items-center sm:justify-between
        "
      >
        <p className="text-sm text-gray-700">
          We use cookies and product analytics to improve Eciperay. See our{' '}
          <Link
            to="/privacy"
            className="text-primary font-medium underline"
          >
            Privacy Policy
          </Link>{' '}
          for details.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            className="
              rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium
              text-gray-800
            "
            onClick={decline}
          >
            Decline
          </button>
          <button
            type="button"
            className="
              bg-primary rounded-lg px-4 py-2 text-sm font-medium text-white
            "
            onClick={accept}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

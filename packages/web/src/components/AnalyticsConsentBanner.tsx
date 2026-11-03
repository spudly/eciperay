import {
  identifyAnalyticsUser,
  readAnalyticsConsent,
  useAuth,
  writeAnalyticsConsent,
} from '@eciperay/client';
import {FixedActionBanner, TextLink} from '@spudly/ui';
import {useState} from 'react';

import {analytics, disablePostHog, enablePostHog} from '../lib/analytics.js';
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
    disablePostHog();
    setVisible(false);
  };

  // The DS FixedActionBanner (B7 C12, design-system#130) carries the
  // banner's layout and actions; it accepts no container role/label, so
  // the consent prompt's dialog semantics stay with the host wrapper —
  // the same web-only ariaLabel/role contract the retired local adapter
  // implemented from @eciperay/client's FixedActionBannerProps.
  return (
    <div
      role="dialog"
      aria-label="Cookie and analytics consent"
    >
      <FixedActionBanner
        position="bottom"
        message={
          <>
            We use cookies and product analytics to improve Eciperay. See our{' '}
            <TextLink href="/privacy">Privacy Policy</TextLink> for details.
          </>
        }
        secondaryAction={{label: 'Decline', onPress: decline}}
        primaryAction={{label: 'Accept', onPress: accept}}
      />
    </div>
  );
};

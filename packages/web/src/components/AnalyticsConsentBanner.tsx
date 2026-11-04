import {
  identifyAnalyticsUser,
  readAnalyticsConsent,
  subscribeAnalyticsConsent,
  useAuth,
  writeAnalyticsConsent,
} from '@eciperay/client';
import {FixedActionBanner, TextLink} from '@spudly/ui';
import {useEffect, useState} from 'react';

import {analytics, disablePostHog, enablePostHog} from '../lib/analytics.js';
import {POSTHOG_KEY} from '../lib/env.js';

const shouldPromptForConsent = () =>
  POSTHOG_KEY.length > 0 && readAnalyticsConsent() === null;

export const AnalyticsConsentBanner = () => {
  const {session} = useAuth();
  const [visible, setVisible] = useState(shouldPromptForConsent);

  // A withdraw/reset from another surface (Profile, the consent
  // preferences page) returns this browser to undecided in the same
  // session: re-present the banner without waiting for a reload (#408).
  // An accept/decline elsewhere hides a banner still showing here.
  useEffect(
    () =>
      subscribeAnalyticsConsent(() => {
        setVisible(shouldPromptForConsent());
      }),
    [],
  );

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
  // implemented from @eciperay/client's FixedActionBannerProps. The
  // wrapper also pins the banner to the viewport: the DS bar positions
  // itself absolute (design-system#405), while the retired local banner
  // was position:fixed — this fixed wrapper becomes the bar's
  // containing block and restores the viewport-pinned behavior (and
  // the old zIndex 50) until the DS pins fixed itself.
  return (
    <div
      role="dialog"
      aria-label="Cookie and analytics consent"
      style={{position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50}}
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

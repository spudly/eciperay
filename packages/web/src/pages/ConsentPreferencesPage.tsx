import {
  clearAnalyticsConsent,
  identifyAnalyticsUser,
  readAnalyticsConsent,
  subscribeAnalyticsConsent,
  useAuth,
  useFeedbackShortcutEnabled,
  writeAnalyticsConsent,
  type AnalyticsConsentStatus,
} from '@eciperay/client';
import {Button, ScreenContainer, SectionCard, Text as DSText} from '@spudly/ui';
import {useEffect, useState} from 'react';

import {analytics, disablePostHog, enablePostHog} from '../lib/analytics.js';

const CONSENT_LABELS: Record<AnalyticsConsentStatus, string> = {
  accepted: 'Accepted',
  declined: 'Declined',
};

/**
 * Consent preferences surface (eciperay#408): the on-demand counterpart to the
 * one-shot AnalyticsConsentBanner. Any visitor — signed in or out — can accept,
 * decline, or withdraw analytics consent here at any time; the footer "Do Not
 * Sell or Share My Personal Information" link lands on this page. Withdraw
 * returns the browser to the undecided state: the stored choice is removed,
 * analytics stops immediately, and the banner re-presents on the next page view
 * as for a new visitor.
 */
export const ConsentPreferencesPage = () => {
  const {session} = useAuth();
  const {
    enabled: feedbackShortcutEnabled,
    setEnabled: setFeedbackShortcutEnabled,
  } = useFeedbackShortcutEnabled();
  const [consent, setConsent] = useState<AnalyticsConsentStatus | null>(
    readAnalyticsConsent,
  );

  // Keep the displayed state in sync with changes from other surfaces
  // or tabs handled in this session (banner, Profile preferences).
  useEffect(
    () =>
      subscribeAnalyticsConsent(status => {
        setConsent(status);
      }),
    [],
  );

  const accept = () => {
    writeAnalyticsConsent('accepted');
    enablePostHog();
    if (session) {
      identifyAnalyticsUser(analytics, session);
    }
    setConsent('accepted');
  };

  // The feedback shortcut sends through PostHog, so any transition that
  // removes consent (decline or withdraw) forces the shortcut preference
  // off — the same #256 rule Profile applies — rather than leaving it on
  // to silently revive at a later accept.
  const forceFeedbackShortcutOff = () => {
    if (feedbackShortcutEnabled) {
      setFeedbackShortcutEnabled(false);
    }
  };

  const decline = () => {
    writeAnalyticsConsent('declined');
    disablePostHog();
    forceFeedbackShortcutOff();
    setConsent('declined');
  };

  const withdraw = () => {
    clearAnalyticsConsent();
    disablePostHog();
    forceFeedbackShortcutOff();
    setConsent(null);
  };

  return (
    <ScreenContainer
      variant="padded"
      scrollable
    >
      <div style={{maxWidth: 640, margin: '0 auto'}}>
        <SectionCard
          title="Privacy choices"
          variant="elevated"
        >
          <DSText>
            Eciperay uses cookies and product analytics (PostHog) to improve the
            service, only with your consent. You can change your choice at any
            time here — changes take effect immediately, without reloading the
            page.
          </DSText>
          <DSText>
            {`Your current choice: ${consent ? CONSENT_LABELS[consent] : 'Not set'}`}
          </DSText>
          <div>
            <Button
              variant="primary"
              onPress={accept}
            >
              Accept analytics consent
            </Button>
            <Button
              variant="secondary"
              onPress={decline}
            >
              Decline analytics consent
            </Button>
            <Button
              variant="secondary"
              onPress={withdraw}
            >
              Withdraw consent
            </Button>
          </div>
          <DSText variant="hint">
            Withdrawing consent removes your stored choice and turns analytics
            off until you make a new choice; the consent banner will ask again,
            as it does for a new visitor. See our Privacy Policy for what
            analytics collects when it is on.
          </DSText>
        </SectionCard>
      </div>
    </ScreenContainer>
  );
};

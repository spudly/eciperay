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
import {useLingui} from '@lingui/react';
import {ConsentPreferencesPage as ConsentPreferencesPageView} from '@spudly/ui';
import {useEffect, useState} from 'react';

import {analytics, disablePostHog, enablePostHog} from '../lib/analytics.js';

/**
 * Consent preferences surface (eciperay#408): the on-demand counterpart to the
 * one-shot AnalyticsConsentBanner. Any visitor — signed in or out — can accept,
 * decline, or withdraw analytics consent here at any time; the footer "Do Not
 * Sell or Share My Personal Information" link lands on this page. Withdraw
 * returns the browser to the undecided state: the stored choice is removed,
 * analytics stops immediately, and the banner re-presents on the next page view
 * as for a new visitor.
 *
 * The DS ConsentPreferencesPage renders the surface; this host keeps the
 * consent record and its side effects: the current choice crosses as data, the
 * three intents report back here, and the host's precise analytics wording
 * crosses as the page's description/hint copy — page-unique copy that flows
 * through the Lingui catalogs (#465 tranche 1: explicit ids
 * `consentPreferences.description` / `consentPreferences.hint`).
 */
export const ConsentPreferencesPage = () => {
  const {i18n} = useLingui();
  const {session} = useAuth();
  const {setEnabled: setFeedbackShortcutEnabled} = useFeedbackShortcutEnabled();
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
  // to silently revive at a later accept. The write is unconditional:
  // this tab's shortcut state can be stale (another tab may
  // have enabled the shortcut), and the persisted preference is what
  // must end up off.
  const forceFeedbackShortcutOff = () => {
    setFeedbackShortcutEnabled(false);
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
    <ConsentPreferencesPageView
      currentChoice={consent}
      onAccept={accept}
      onDecline={decline}
      onWithdraw={withdraw}
      description={i18n._({
        id: 'consentPreferences.description',
        message:
          'Eciperay uses cookies and product analytics (PostHog) to improve the service, only with your consent. You can change your choice at any time here — changes take effect immediately, without reloading the page.',
      })}
      hint={i18n._({
        id: 'consentPreferences.hint',
        message:
          'Withdrawing consent removes your stored choice and turns analytics off until you make a new choice; the consent banner will ask again, as it does for a new visitor. See our Privacy Policy for what analytics collects when it is on.',
      })}
    />
  );
};

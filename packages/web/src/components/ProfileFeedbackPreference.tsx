import {
  identifyAnalyticsUser,
  readAnalyticsConsent,
  useAuth,
  useFeedbackShortcutEnabled,
  writeAnalyticsConsent,
  type AnalyticsConsentStatus,
} from '@eciperay/client';
import {useState} from 'react';
import type {ComponentType} from 'react';
import type {ShowcaseFrameProps} from '@eciperay/client';

import {analytics, disablePostHog, enablePostHog} from '../lib/analytics.js';
import {POSTHOG_KEY} from '../lib/env.js';

import {CheckboxField} from './ui/CheckboxField.js';
import {PrimaryButton} from './ui/PrimaryButton.js';
import {SecondaryButton} from './ui/SecondaryButton.js';
import {SectionCard} from './ui/SectionCard.js';

const CONSENT_LABELS: Record<AnalyticsConsentStatus, string> = {
  accepted: 'Accepted',
  declined: 'Declined',
};

export const ProfileFeedbackPreference = () => {
  const {enabled, setEnabled} = useFeedbackShortcutEnabled();
  const {session} = useAuth();
  const analyticsConfigured = POSTHOG_KEY.length > 0;
  const [consent, setConsent] = useState<AnalyticsConsentStatus | null>(
    readAnalyticsConsent,
  );
  const [consentPromptOpen, setConsentPromptOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptConsent = () => {
    writeAnalyticsConsent('accepted');
    enablePostHog();
    if (session) {
      identifyAnalyticsUser(analytics, session);
    }
    setConsent('accepted');
    setConsentPromptOpen(false);
    setError(null);
  };

  const declineConsent = () => {
    writeAnalyticsConsent('declined');
    // If PostHog was already enabled this session (consent previously
    // accepted), stop collection immediately rather than at next reload.
    disablePostHog();
    setConsent('declined');
    setConsentPromptOpen(false);
    if (enabled) {
      // The shortcut cannot send feedback without analytics consent, so
      // declining consent forces the preference off rather than leaving it
      // on with no visible effect.
      setEnabled(false);
      setError(
        'The feedback shortcut needs analytics consent to send feedback, so it has been turned off.',
      );
    }
  };

  const handleToggle = (next: boolean) => {
    setError(null);
    if (!next) {
      setEnabled(false);
      setConsentPromptOpen(false);
      return;
    }
    setEnabled(true);
    // Forced re-consent (Stephen's decision on #256): enabling the shortcut
    // always re-presents the consent prompt, even when a consent decision
    // already exists, so the requirement is never a hidden gate.
    setConsentPromptOpen(true);
  };

  return (
    <SectionCard title="Preferences">
      <CheckboxField
        checked={enabled}
        disabled={!analyticsConfigured}
        onChange={handleToggle}
        label="Show feedback shortcut"
        description="Adds a floating feedback button so you can send product feedback. Submissions are sent to PostHog when you use it."
      >
        {analyticsConfigured ? null : (
          <span className="mbs-1 block text-gray-500">
            Feedback is unavailable because analytics is not configured in this
            environment.
          </span>
        )}
        {analyticsConfigured ? (
          <div className="mbs-2 flex flex-col gap-2">
            <span className="block text-gray-500">
              Analytics consent: {consent ? CONSENT_LABELS[consent] : 'Not set'}
            </span>
            {consentPromptOpen ? (
              <div
                role="group"
                aria-label="Analytics consent for feedback"
                className="flex flex-col gap-2"
              >
                <span className="block text-gray-700">
                  The feedback shortcut sends feedback through PostHog, which
                  needs your analytics consent. Accept to keep the shortcut on,
                  or decline to turn it off.
                </span>
                <div className="flex gap-2">
                  <SecondaryButton
                    label="Decline"
                    onPress={declineConsent}
                  />
                  <PrimaryButton
                    label="Accept"
                    onPress={acceptConsent}
                  />
                </div>
              </div>
            ) : consent === 'accepted' ? (
              <div>
                <SecondaryButton
                  label="Decline analytics consent"
                  onPress={declineConsent}
                />
              </div>
            ) : (
              <div>
                <PrimaryButton
                  label="Accept analytics consent"
                  onPress={acceptConsent}
                />
              </div>
            )}
            {error ? (
              <span
                role="alert"
                className="block text-red-600"
              >
                {error}
              </span>
            ) : null}
          </div>
        ) : null}
      </CheckboxField>
    </SectionCard>
  );
};

if (import.meta.env.DEV) {
  ProfileFeedbackPreference.demo = function ProfileFeedbackPreferenceDemo({
    Frame,
  }: {
    Frame: ComponentType<ShowcaseFrameProps>;
  }) {
    return (
      <Frame>
        <ProfileFeedbackPreference />
      </Frame>
    );
  };
}

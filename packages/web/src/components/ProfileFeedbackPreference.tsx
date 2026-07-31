import {
  readAnalyticsConsent,
  useFeedbackShortcutEnabled,
} from '@eciperay/client';
import type {ComponentType} from 'react';
import type {ShowcaseFrameProps} from '@eciperay/client';

import {POSTHOG_KEY} from '../lib/env.js';

import {CheckboxField} from './ui/CheckboxField.js';
import {SectionCard} from './ui/SectionCard.js';

export const ProfileFeedbackPreference = () => {
  const {enabled, setEnabled} = useFeedbackShortcutEnabled();
  const analyticsConfigured = POSTHOG_KEY.length > 0;
  const analyticsConsentAccepted = readAnalyticsConsent() === 'accepted';

  return (
    <SectionCard title="Preferences">
      <CheckboxField
        checked={enabled}
        disabled={!analyticsConfigured}
        onChange={setEnabled}
        label="Show feedback shortcut"
        description="Adds a floating feedback button so you can send product feedback. Submissions are sent to PostHog when you use it."
      >
        {analyticsConfigured ? null : (
          <span className="mt-1 block text-gray-500">
            Feedback is unavailable because analytics is not configured in this
            environment.
          </span>
        )}
        {analyticsConfigured && !analyticsConsentAccepted ? (
          <span className="mt-1 block text-gray-500">
            On the web, you also need to accept analytics cookies before the
            shortcut can send feedback.
          </span>
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

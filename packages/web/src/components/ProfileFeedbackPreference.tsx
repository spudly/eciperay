import {
  readAnalyticsConsent,
  useFeedbackShortcutEnabled,
} from '@eciperay/client';
import type {ComponentType} from 'react';
import type {ShowcaseFrameProps} from '@eciperay/client';

import {POSTHOG_KEY} from '../lib/env.js';

export const ProfileFeedbackPreference = () => {
  const {enabled, setEnabled} = useFeedbackShortcutEnabled();
  const analyticsConfigured = POSTHOG_KEY.length > 0;
  const analyticsConsentAccepted = readAnalyticsConsent() === 'accepted';

  return (
    <section className="mbe-8 rounded-xl bg-white p-4 shadow-sm">
      <h2 className="mbe-1 text-lg font-semibold text-gray-900">Preferences</h2>
      <label className="flex items-start gap-3 text-sm text-gray-700">
        <input
          type="checkbox"
          className="mt-1"
          checked={enabled}
          disabled={!analyticsConfigured}
          onChange={event => {
            setEnabled(event.target.checked);
          }}
        />
        <span>
          <span className="font-medium text-gray-900">
            Show feedback shortcut
          </span>
          <span className="mt-1 block">
            Adds a floating feedback button so you can send product feedback.
            Submissions are sent to PostHog when you use it.
          </span>
          {analyticsConfigured ? null : (
            <span className="mt-1 block text-gray-500">
              Feedback is unavailable because analytics is not configured in
              this environment.
            </span>
          )}
          {analyticsConfigured && !analyticsConsentAccepted ? (
            <span className="mt-1 block text-gray-500">
              On the web, you also need to accept analytics cookies before the
              shortcut can send feedback.
            </span>
          ) : null}
        </span>
      </label>
    </section>
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

import {
  type ShowcaseDemoRenderer,
  useFeedbackShortcutEnabled,
} from '@eciperay/client';
import {Text} from 'react-native';

import {POSTHOG_KEY} from '../lib/env';

import {CheckboxField} from './ui/CheckboxField';
import {SectionCard} from './ui/SectionCard';

export const ProfileFeedbackPreference = () => {
  const {enabled, setEnabled} = useFeedbackShortcutEnabled();
  const analyticsConfigured = POSTHOG_KEY.length > 0;

  return (
    <SectionCard title="Preferences">
      <CheckboxField
        checked={enabled}
        disabled={!analyticsConfigured}
        onChange={setEnabled}
        label="Show feedback shortcut"
        description="Adds a Feedback tab so you can send product feedback. Submissions are sent to PostHog when you use it."
      >
        {analyticsConfigured ? null : (
          <Text className="text-muted mbs-1 text-sm">
            Feedback is unavailable because analytics is not configured in this
            environment.
          </Text>
        )}
      </CheckboxField>
    </SectionCard>
  );
};

if (__DEV__) {
  const profileFeedbackPreferenceDemo: ShowcaseDemoRenderer = ({Frame}) => (
    <Frame>
      <ProfileFeedbackPreference />
    </Frame>
  );
  ProfileFeedbackPreference.demo = profileFeedbackPreferenceDemo;
}

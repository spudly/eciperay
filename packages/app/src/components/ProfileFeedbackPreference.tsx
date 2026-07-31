import {
  type ShowcaseDemoRenderer,
  useFeedbackShortcutEnabled,
} from '@eciperay/client';
import {Switch, Text, View} from 'react-native';

import {POSTHOG_KEY} from '../lib/env';

export const ProfileFeedbackPreference = () => {
  const {enabled, setEnabled} = useFeedbackShortcutEnabled();
  const analyticsConfigured = POSTHOG_KEY.length > 0;

  return (
    <View className="mb-8 rounded-xl bg-white p-4 shadow-sm">
      <Text className="mb-3 text-lg font-semibold text-gray-900">
        Preferences
      </Text>
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1">
          <Text className="text-sm font-medium text-gray-900">
            Show feedback shortcut
          </Text>
          <Text className="text-muted mt-1 text-sm">
            Adds a Feedback tab so you can send product feedback. Submissions
            are sent to PostHog when you use it.
          </Text>
          {analyticsConfigured ? null : (
            <Text className="text-muted mt-1 text-sm">
              Feedback is unavailable because analytics is not configured in
              this environment.
            </Text>
          )}
        </View>
        <Switch
          value={enabled}
          disabled={!analyticsConfigured}
          onValueChange={setEnabled}
          accessibilityLabel="Show feedback shortcut"
        />
      </View>
    </View>
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

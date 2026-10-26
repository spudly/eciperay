import {
  type ShowcaseDemoRenderer,
  useFeedbackShortcutEnabled,
} from '@eciperay/client';
import {SectionCard as DsSectionCard, Text as DsText, tokens} from '@spudly/ui';

import {POSTHOG_KEY} from '../../lib/env';

import {CheckboxField} from '../../components/ui/CheckboxField';

export const ProfileFeedbackPreference = () => {
  const {enabled, setEnabled} = useFeedbackShortcutEnabled();
  const analyticsConfigured = POSTHOG_KEY.length > 0;

  return (
    <DsSectionCard
      title="Preferences"
      variant="elevated"
      marginBottom="$8"
    >
      <CheckboxField
        checked={enabled}
        disabled={!analyticsConfigured}
        onChange={setEnabled}
        label="Show feedback shortcut"
        description="Adds a Feedback tab so you can send product feedback. Submissions are sent to PostHog when you use it."
      >
        {analyticsConfigured ? null : (
          <DsText
            color="$textMuted"
            marginBlockStart="$1"
            fontSize={tokens.typography.fontSize.sm}
          >
            Feedback is unavailable because analytics is not configured in this
            environment.
          </DsText>
        )}
      </CheckboxField>
    </DsSectionCard>
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

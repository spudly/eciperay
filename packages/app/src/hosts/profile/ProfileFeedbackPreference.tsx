import {useFeedbackShortcutEnabled} from '@eciperay/client';
import {tokens} from '@spudly/ui';
import {useId} from 'react';
import {Checkbox, Label, Text, XStack, YStack} from 'tamagui';

import {POSTHOG_KEY} from '../../lib/env';

import {SectionCard} from './profileSection';

/**
 * The ProfilePage feedbackPreference slot content, kept host-side: the app's
 * section has no analytics-consent state (the consent state machine is
 * web-only), so it does not fit the design system's FeedbackPreferenceView data
 * contract — that view requires a consent value and accept/decline callbacks
 * and renders consent actions this surface never had. The section is therefore
 * re-expressed here with Tamagui primitives mirroring the design-system
 * CheckboxField treatment (44px touch target, 24px visual box, label toggles
 * the checkbox), pending page coverage for this exact composition.
 */
export const ProfileFeedbackPreference = () => {
  const {enabled, setEnabled} = useFeedbackShortcutEnabled();
  const analyticsConfigured = POSTHOG_KEY.length > 0;
  const disabled = !analyticsConfigured;
  const id = useId();
  const labelId = `${id}-label`;

  const toggle = () => {
    if (!disabled) {
      setEnabled(!enabled);
    }
  };

  return (
    <YStack marginBottom="$8">
      <SectionCard
        title="Preferences"
        variant="elevated"
      >
        <YStack gap={tokens.spacing[1]}>
          <XStack
            alignItems="center"
            gap={tokens.spacing[3]}
            minHeight={44}
          >
            <Checkbox
              id={id}
              checked={enabled}
              disabled={disabled}
              onCheckedChange={next => {
                setEnabled(next === true);
              }}
              aria-labelledby={labelId}
              accessibilityLabel="Show feedback shortcut"
              width={24}
              height={24}
              borderWidth={2}
              borderRadius={tokens.radii.sm}
              borderColor={enabled ? '$primary' : '$textMuted'}
              backgroundColor={enabled ? '$primary' : '$surface'}
            >
              <Checkbox.Indicator>
                <Text
                  aria-hidden
                  color="$onPrimary"
                  fontSize={tokens.typography.fontSize.sm}
                  fontWeight={tokens.typography.fontWeight.bold}
                >
                  ✓
                </Text>
              </Checkbox.Indicator>
            </Checkbox>
            <YStack
              flex={1}
              gap={tokens.spacing[1]}
            >
              <Label
                id={labelId}
                onPress={toggle}
                fontSize={tokens.typography.fontSize.md}
              >
                Show feedback shortcut
              </Label>
              <Text
                fontSize={tokens.typography.fontSize.sm}
                color="$textMuted"
              >
                Adds a Feedback tab so you can send product feedback.
                Submissions are sent to PostHog when you use it.
              </Text>
            </YStack>
          </XStack>
          {analyticsConfigured ? null : (
            <Text
              color="$textMuted"
              marginBlockStart="$1"
              fontSize={tokens.typography.fontSize.sm}
            >
              Feedback is unavailable because analytics is not configured in
              this environment.
            </Text>
          )}
        </YStack>
      </SectionCard>
    </YStack>
  );
};

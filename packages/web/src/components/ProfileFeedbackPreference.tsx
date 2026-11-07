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
import {tokens} from '@spudly/ui';
import {useEffect, useId, useState} from 'react';
import type {ComponentType, ReactNode} from 'react';
import type {ShowcaseFrameProps} from '@eciperay/client';
import {
  Anchor,
  Button,
  Checkbox,
  Label,
  Text,
  XStack,
  YStack,
  styled,
} from 'tamagui';

import {analytics, disablePostHog, enablePostHog} from '../lib/analytics.js';
import {POSTHOG_KEY} from '../lib/env.js';

const CONSENT_LABELS: Record<AnalyticsConsentStatus, string> = {
  accepted: 'Accepted',
  declined: 'Declined',
};

const StyledCheckbox = styled(Checkbox, {
  name: 'ProfileCheckbox',

  width: 44,
  height: 44,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'transparent',
  borderWidth: 0,
});

const StyledCheckboxBox = styled(XStack, {
  name: 'ProfileCheckboxBox',

  width: 24,
  height: 24,
  overflow: 'hidden',
  borderWidth: 2,
  borderRadius: tokens.radii.sm,
  alignItems: 'center',
  justifyContent: 'center',
});

const PreferenceButton = ({
  variant,
  onPress,
  children,
}: {
  variant: 'primary' | 'secondary';
  onPress: () => void;
  children: string;
}) => (
  <Button
    backgroundColor={
      variant === 'primary' ? '$primary' : tokens.colors.gray.gray3
    }
    borderColor={
      variant === 'primary' ? 'transparent' : tokens.colors.gray.gray10
    }
    borderWidth={1}
    borderRadius={tokens.radii.md}
    color={variant === 'primary' ? '$onPrimary' : tokens.colors.gray.gray10}
    fontSize={tokens.typography.fontSize.md}
    fontWeight={tokens.typography.fontWeight.semibold}
    paddingHorizontal={tokens.spacing[4]}
    paddingVertical={tokens.spacing[3]}
    onPress={onPress}
  >
    {children}
  </Button>
);

const HintText = ({children}: {children: ReactNode}) => (
  <Text
    fontSize={tokens.typography.fontSize.sm}
    color="$textMuted"
  >
    {children}
  </Text>
);

/**
 * The DS ProfilePage's feedbackPreference slot content: the consent state
 * machine stays web-side (eciperay#256/#299 — enabling the shortcut always
 * re-presents the consent prompt; declining consent forces the preference off).
 * It stays in the slot rather than moving to the page's
 * feedbackPreferenceSection data prop because its presentation does not fit
 * that view contract: outside the prompt it offers a single state-dependent
 * action with long labels ("Decline analytics consent" / "Accept analytics
 * consent"), while the prompt itself uses the short "Accept" / "Decline" pair —
 * the view renders both actions with one shared label set. The section is
 * therefore composed host-side from Tamagui primitives.
 */
export const ProfileFeedbackPreference = () => {
  const {enabled, setEnabled} = useFeedbackShortcutEnabled();
  const {session} = useAuth();
  const analyticsConfigured = POSTHOG_KEY.length > 0;
  const [consent, setConsent] = useState<AnalyticsConsentStatus | null>(
    readAnalyticsConsent,
  );
  const [consentPromptOpen, setConsentPromptOpen] = useState(false);

  // Follow consent changes made on other surfaces (the banner, the
  // privacy choices page, another tab) while Profile is open, so the
  // displayed state and the withdraw action stay accurate (#408).
  useEffect(
    () =>
      subscribeAnalyticsConsent(status => {
        setConsent(status);
      }),
    [],
  );
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

  const withdrawConsent = () => {
    clearAnalyticsConsent();
    // Withdrawing returns the browser to undecided; analytics stops now,
    // and (like declining) the feedback shortcut cannot stay on without
    // consent, so it is forced off with the same explanation (#408/#256).
    disablePostHog();
    setConsent(null);
    setConsentPromptOpen(false);
    if (enabled) {
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

  const checkboxId = useId();
  const checkboxLabelId = `${checkboxId}-label`;

  return (
    <YStack
      backgroundColor="$surface"
      borderWidth={0}
      borderRadius={tokens.radii.lg}
      padding={tokens.spacing[4]}
      shadowColor={tokens.shadows.md.shadowColor}
      shadowOffset={tokens.shadows.md.shadowOffset}
      shadowOpacity={tokens.shadows.md.shadowOpacity}
      shadowRadius={tokens.shadows.md.shadowRadius}
      marginBottom="$8"
    >
      <YStack paddingBottom={tokens.spacing[3]}>
        <Text
          fontSize={tokens.typography.fontSize.xl}
          fontWeight={tokens.typography.fontWeight.semibold}
        >
          Preferences
        </Text>
      </YStack>
      <YStack gap={tokens.spacing[1]}>
        <XStack
          alignItems="center"
          gap={tokens.spacing[3]}
          minHeight={44}
        >
          <StyledCheckbox
            id={checkboxId}
            checked={enabled}
            onCheckedChange={next => handleToggle(next === true)}
            disabled={!analyticsConfigured}
            aria-labelledby={checkboxLabelId}
          >
            <StyledCheckboxBox
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
            </StyledCheckboxBox>
          </StyledCheckbox>
          <YStack
            flex={1}
            gap={tokens.spacing[1]}
          >
            <Label
              id={checkboxLabelId}
              onPress={() => {
                handleToggle(!enabled);
              }}
              fontSize={tokens.typography.fontSize.md}
            >
              Show feedback shortcut
            </Label>
            <HintText>
              Adds a floating feedback button so you can send product feedback.
              Submissions are sent to PostHog when you use it.
            </HintText>
          </YStack>
        </XStack>
        {analyticsConfigured ? null : (
          <HintText>
            Feedback is unavailable because analytics is not configured in this
            environment.
          </HintText>
        )}
        {analyticsConfigured ? (
          <YStack gap="$2">
            <HintText>
              {`Analytics consent: ${consent ? CONSENT_LABELS[consent] : 'Not set'}`}
            </HintText>
            {consentPromptOpen ? (
              <YStack
                role="group"
                aria-label="Analytics consent for feedback"
                gap="$2"
              >
                <Text fontSize={tokens.typography.fontSize.md}>
                  The feedback shortcut sends feedback through PostHog, which
                  needs your analytics consent. Accept to keep the shortcut on,
                  or decline to turn it off.
                </Text>
                <XStack gap="$2">
                  <PreferenceButton
                    variant="secondary"
                    onPress={declineConsent}
                  >
                    Decline
                  </PreferenceButton>
                  <PreferenceButton
                    variant="primary"
                    onPress={acceptConsent}
                  >
                    Accept
                  </PreferenceButton>
                </XStack>
              </YStack>
            ) : consent === 'accepted' ? (
              <div>
                <PreferenceButton
                  variant="secondary"
                  onPress={declineConsent}
                >
                  Decline analytics consent
                </PreferenceButton>
              </div>
            ) : (
              <div>
                <PreferenceButton
                  variant="primary"
                  onPress={acceptConsent}
                >
                  Accept analytics consent
                </PreferenceButton>
              </div>
            )}
            {consent ? (
              <div>
                <PreferenceButton
                  variant="secondary"
                  onPress={withdrawConsent}
                >
                  Withdraw analytics consent
                </PreferenceButton>
              </div>
            ) : null}
            <HintText>
              Manage your choice at any time on the{' '}
              <Anchor
                href="/privacy/consent"
                color="$link"
                fontSize={tokens.typography.fontSize.sm}
                fontWeight={tokens.typography.fontWeight.medium}
                textDecorationLine="underline"
              >
                privacy choices page
              </Anchor>
              .
            </HintText>
            {error ? (
              <YStack role="alert">
                <Text
                  fontSize={tokens.typography.fontSize.sm}
                  color="$errorText"
                >
                  {error}
                </Text>
              </YStack>
            ) : null}
          </YStack>
        ) : null}
      </YStack>
    </YStack>
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

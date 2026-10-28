import {ScreenContainer, Text, TextLink} from '@spudly/ui';

type AuthConfirmationProps = {
  title: string;
  body: string;
  backLabel?: string;
  onBackPress?: () => void;
};

/**
 * Host-rendered post-submit state for the auth flows (B7 cluster C3,
 * design-system#130). The design system auth pages report the submit intent
 * only — the confirmation states (sign-up email sent, reset-link sent, password
 * updated) are host state, the same split the native app applies (its screens
 * alert and navigate instead of rendering a DS confirmation view). Rendered in
 * the DS auth shell so the state sits in the same frame as the form it
 * follows.
 */
export const AuthConfirmation = ({
  title,
  body,
  backLabel,
  onBackPress,
}: AuthConfirmationProps) => (
  <ScreenContainer
    scrollable={false}
    variant="auth"
  >
    <Text variant="heading">{title}</Text>
    <Text color="$textMuted">{body}</Text>
    {backLabel && onBackPress ? (
      <TextLink onPress={onBackPress}>{backLabel}</TextLink>
    ) : null}
  </ScreenContainer>
);

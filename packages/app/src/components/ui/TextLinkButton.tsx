import type {TextLinkButtonProps} from '@eciperay/client';
import {TextLink, tokens} from '@spudly/ui';

/**
 * Thin adapter over the DS TextLink. The old ghost-Button stand-in is gone: the
 * primary variant uses the link's semantic $link color; the muted variant keeps
 * the gray tone and tighter top spacing it had as a small ghost button. The app
 * API's onPress is optional (the DS link requires one), so a missing handler
 * becomes a no-op — the old Button was equally inert without one.
 */
export const TextLinkButton = ({
  label,
  onPress,
  variant = 'primary',
}: TextLinkButtonProps) => (
  <TextLink
    color={variant === 'primary' ? undefined : tokens.colors.gray.gray6}
    marginTop={variant === 'primary' ? '$4' : '$2'}
    onPress={
      onPress ??
      (() => {
        void 0;
      })
    }
  >
    {label}
  </TextLink>
);

if (__DEV__) {
  TextLinkButton.demo = () => (
    <TextLinkButton
      label="Text link"
      onPress={() => {
        void 0;
      }}
    />
  );
}

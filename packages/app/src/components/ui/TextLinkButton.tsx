import type {TextLinkButtonProps} from '@eciperay/client';
import {Button as DsButton, tokens} from '@spudly/ui';

export const TextLinkButton = ({
  label,
  onPress,
  variant = 'primary',
}: TextLinkButtonProps) => (
  <DsButton
    variant="ghost"
    size={variant === 'primary' ? 'md' : 'sm'}
    color={
      variant === 'primary' ? undefined : tokens.colors.gray.gray6
    }
    marginTop={variant === 'primary' ? tokens.spacing[4] : tokens.spacing[2]}
    onPress={onPress}
  >
    {label}
  </DsButton>
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

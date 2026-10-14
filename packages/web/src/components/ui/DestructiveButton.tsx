import type {DestructiveButtonProps} from '@eciperay/client';
import {Button as DSButton, tokens} from '@spudly/ui';

export const DestructiveButton = ({
  label,
  onPress,
  disabled = false,
}: DestructiveButtonProps) => (
  <DSButton
    variant="primary"
    backgroundColor={tokens.colors.danger.danger7}
    disabled={disabled}
    onPress={onPress}
  >
    {label}
  </DSButton>
);

if (import.meta.env.DEV) {
  DestructiveButton.demo = function DestructiveButtonDemo() {
    return (
      <DestructiveButton
        label="Destructive"
        onPress={() => {
          void 0;
        }}
      />
    );
  };
}

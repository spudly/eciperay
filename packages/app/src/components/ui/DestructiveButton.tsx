import type {DestructiveButtonProps} from '@eciperay/client';
import {Button as DsButton, tokens} from '@spudly/ui';

export const DestructiveButton = ({
  label,
  onPress,
  disabled = false,
}: DestructiveButtonProps) => (
  <DsButton
    variant="primary"
    backgroundColor={tokens.colors.danger.danger7}
    onPress={onPress}
    disabled={disabled}
  >
    {label}
  </DsButton>
);

if (__DEV__) {
  DestructiveButton.demo = () => (
    <DestructiveButton
      label="Destructive"
      onPress={() => {
        void 0;
      }}
    />
  );
}

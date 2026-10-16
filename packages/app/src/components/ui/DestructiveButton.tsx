import type {DestructiveButtonProps} from '@eciperay/client';
import {Button as DsButton} from '@spudly/ui';

export const DestructiveButton = ({
  label,
  onPress,
  disabled = false,
}: DestructiveButtonProps) => (
  <DsButton
    variant="danger"
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

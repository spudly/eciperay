import type {SecondaryButtonProps} from '@eciperay/client';
import {Button as DsButton} from '@spudly/ui';

export const SecondaryButton = ({
  label,
  onPress,
  disabled = false,
}: SecondaryButtonProps) => (
  <DsButton variant="secondary" onPress={onPress} disabled={disabled}>
    {label}
  </DsButton>
);

if (__DEV__) {
  SecondaryButton.demo = () => (
    <SecondaryButton
      label="Secondary"
      onPress={() => {
        void 0;
      }}
    />
  );
}

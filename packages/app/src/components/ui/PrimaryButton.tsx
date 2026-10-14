import type {PrimaryButtonProps} from '@eciperay/client';
import {Button as DsButton} from '@spudly/ui';

export const PrimaryButton = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  loadingLabel,
}: PrimaryButtonProps) => (
  <DsButton
    variant="primary"
    onPress={onPress}
    disabled={disabled || loading}
    accessibilityLabel={label}
  >
    {loading ? (loadingLabel ?? label) : label}
  </DsButton>
);

if (__DEV__) {
  PrimaryButton.demo = () => (
    <PrimaryButton
      label="Primary"
      onPress={() => {
        void 0;
      }}
    />
  );
}

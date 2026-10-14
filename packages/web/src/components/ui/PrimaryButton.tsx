import type {PrimaryButtonProps} from '@eciperay/client';
import {Button as DSButton} from '@spudly/ui';

export const PrimaryButton = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  loadingLabel,
  type = 'button',
}: PrimaryButtonProps) => (
  <DSButton
    variant="primary"
    disabled={disabled || loading}
    onPress={type === 'submit' ? undefined : onPress}
    type={type}
  >
    {loading ? (loadingLabel ?? label) : label}
  </DSButton>
);

if (import.meta.env.DEV) {
  PrimaryButton.demo = function PrimaryButtonDemo() {
    return (
      <PrimaryButton
        label="Primary"
        onPress={() => {
          void 0;
        }}
      />
    );
  };
}

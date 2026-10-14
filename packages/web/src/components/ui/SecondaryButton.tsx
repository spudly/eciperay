import type {SecondaryButtonProps} from '@eciperay/client';
import {Button as DSButton} from '@spudly/ui';

export const SecondaryButton = ({
  label,
  onPress,
  disabled = false,
}: SecondaryButtonProps) => (
  <DSButton
    variant="secondary"
    disabled={disabled}
    onPress={onPress}
  >
    {label}
  </DSButton>
);

if (import.meta.env.DEV) {
  SecondaryButton.demo = function SecondaryButtonDemo() {
    return (
      <SecondaryButton
        label="Secondary"
        onPress={() => {
          void 0;
        }}
      />
    );
  };
}

import type {CheckboxFieldProps} from '@eciperay/client';
import {CheckboxField as DsCheckboxField, Text as DsText} from '@spudly/ui';
import {useState} from 'react';
import {YStack} from 'tamagui';

export const CheckboxField = ({
  checked,
  onChange,
  disabled = false,
  label,
  description,
  children,
}: CheckboxFieldProps) => (
  <YStack gap="$3">
    <DsCheckboxField
      checked={checked}
      onCheckedChange={onChange}
      disabled={disabled}
      label={label}
      description={typeof description === 'string' ? description : undefined}
    />
    {typeof description !== 'string' && description ? (
      // Rich descriptions must render inside a Text component: React
      // Native rejects raw strings under a View (test-renderer enforces
      // this in tests). Mirrors the web adapter.
      <DsText variant="hint">{description}</DsText>
    ) : null}
    {children}
  </YStack>
);

if (__DEV__) {
  const CheckboxFieldDemo = () => {
    const [checked, setChecked] = useState(true);

    return (
      <CheckboxField
        checked={checked}
        onChange={setChecked}
        label="Enable notifications"
        description="Receive updates about recipe changes."
      />
    );
  };

  CheckboxField.demo = () => <CheckboxFieldDemo />;
}

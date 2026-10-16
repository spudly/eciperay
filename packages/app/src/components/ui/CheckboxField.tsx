import type {CheckboxFieldProps} from '@eciperay/client';
import {CheckboxField as DsCheckboxField} from '@spudly/ui';
import {useState} from 'react';
import {View} from 'react-native';
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
      <View>{description}</View>
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

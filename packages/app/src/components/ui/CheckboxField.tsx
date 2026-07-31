import type {CheckboxFieldProps} from '@eciperay/client';
import {useState} from 'react';
import {Switch, Text, View} from 'react-native';

export const CheckboxField = ({
  checked,
  onChange,
  disabled = false,
  label,
  description,
  children,
}: CheckboxFieldProps) => (
  <View className="ui-checkbox-field flex-row items-start justify-between gap-4">
    <View className="flex-1">
      <Text className="text-sm font-medium text-gray-900">{label}</Text>
      {description ? (
        <Text className="text-muted mt-1 text-sm">{description}</Text>
      ) : null}
      {children}
    </View>
    <Switch
      value={checked}
      disabled={disabled}
      onValueChange={onChange}
      accessibilityLabel={label}
    />
  </View>
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

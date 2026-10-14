import type {CheckboxFieldProps} from '@eciperay/client';
import {CheckboxField as DsCheckboxField} from '@spudly/ui';
import {useState} from 'react';
import {View} from 'react-native';

export const CheckboxField = ({
  checked,
  onChange,
  disabled = false,
  label,
  description,
  children,
}: CheckboxFieldProps) => (
  <View className="ui-checkbox-field">
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

import type {SelectFieldProps} from '@eciperay/client';
import {SelectField as DsSelectField} from '@spudly/ui';
import {useState} from 'react';
import {View} from 'tamagui';

export const SelectField = ({
  label,
  value,
  onChange,
  options,
  disabled = false,
  id,
}: SelectFieldProps) => (
  <View
    pointerEvents={disabled ? 'none' : 'auto'}
    opacity={disabled ? 0.5 : undefined}
    accessibilityState={{disabled}}
  >
    <DsSelectField
      label={label}
      value={value}
      onValueChange={next => {
        if (!disabled) {
          onChange(next);
        }
      }}
      options={options}
      id={id}
    />
  </View>
);

if (__DEV__) {
  const SelectFieldDemo = () => {
    const [value, setValue] = useState('a');

    return (
      <SelectField
        label="Choose one"
        value={value}
        onChange={setValue}
        options={[
          {value: 'a', label: 'Option A'},
          {value: 'b', label: 'Option B'},
        ]}
      />
    );
  };

  SelectField.demo = () => <SelectFieldDemo />;
}

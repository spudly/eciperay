import type {SelectFieldProps} from '@eciperay/client';
import {SelectField as DsSelectField} from '@spudly/ui';
import {useState} from 'react';
import {StyleSheet, View} from 'react-native';

const styles = StyleSheet.create({
  dimmed: {opacity: 0.5},
});

export const SelectField = ({
  label,
  value,
  onChange,
  options,
  disabled = false,
  id,
}: SelectFieldProps) => (
  <View
    className="ui-select-field"
    pointerEvents={disabled ? 'none' : 'auto'}
    style={disabled ? styles.dimmed : undefined}
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

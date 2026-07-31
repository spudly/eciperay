import type {ColorPickerFieldProps} from '@eciperay/client';
import {useState} from 'react';
import {Text, TextInput, View} from 'react-native';

export const ColorPickerField = ({
  label,
  value,
  onChange,
  name,
  disabled = false,
}: ColorPickerFieldProps) => (
  <View>
    {label ? (
      <Text className="mb-1 text-sm font-medium text-gray-700">{label}</Text>
    ) : null}
    <TextInput
      nativeID={name}
      className="ui-text-field w-28"
      value={value}
      editable={!disabled}
      autoCapitalize="none"
      autoCorrect={false}
      placeholder="#6366f1"
      onChangeText={onChange}
    />
  </View>
);

if (__DEV__) {
  const ColorPickerFieldDemo = () => {
    const [value, setValue] = useState('#6366f1');

    return (
      <ColorPickerField
        label="Tag color"
        value={value}
        onChange={setValue}
      />
    );
  };

  ColorPickerField.demo = () => <ColorPickerFieldDemo />;
}

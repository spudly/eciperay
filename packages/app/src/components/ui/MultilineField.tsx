import type {MultilineFieldProps} from '@eciperay/client';
import {TextInput} from 'react-native';
import {useState} from 'react';

export const MultilineField = ({
  value,
  onChange,
  placeholder,
}: MultilineFieldProps) => (
  <TextInput
    className="ui-multiline-field mb-4"
    multiline
    onChangeText={onChange}
    placeholder={placeholder}
    textAlignVertical="top"
    value={value}
  />
);

if (__DEV__) {
  const MultilineFieldDemo = () => {
    const [value, setValue] = useState('Line one\nLine two');

    return (
      <MultilineField
        value={value}
        onChange={setValue}
        placeholder="Multiline input"
      />
    );
  };

  MultilineField.demo = () => <MultilineFieldDemo />;
}

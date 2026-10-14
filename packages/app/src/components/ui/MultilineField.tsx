import type {MultilineFieldProps} from '@eciperay/client';
import {MultilineField as DsMultilineField} from '@spudly/ui';
import {useState} from 'react';

export const MultilineField = ({
  value,
  onChange,
  placeholder,
  rows,
}: MultilineFieldProps) => (
  <DsMultilineField
    value={value}
    onChangeText={onChange}
    placeholder={placeholder}
    numberOfLines={rows}
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

import type {MultilineFieldProps} from '@eciperay/client';
import {TextAreaField as DSTextAreaField} from '@spudly/ui';
import {useState} from 'react';

// The design system retired its MultilineField in favor of
// TextAreaField (@spudly/ui 1.15.0); this mirror keeps the app's
// MultilineField name and prop shape over the new field.
export const MultilineField = ({
  value,
  onChange,
  placeholder,
  rows = 8,
}: MultilineFieldProps) => (
  <DSTextAreaField
    value={value}
    onChangeText={onChange}
    placeholder={placeholder}
    numberOfLines={rows}
  />
);

if (import.meta.env.DEV) {
  MultilineField.demo = function MultilineFieldDemo() {
    const [value, setValue] = useState('Line one\nLine two');

    return (
      <MultilineField
        value={value}
        onChange={setValue}
        placeholder="Multiline input"
      />
    );
  };
}

import type {MultilineFieldProps} from '@eciperay/client';
import {useState} from 'react';

export const MultilineField = ({
  value,
  onChange,
  placeholder,
  rows = 8,
}: MultilineFieldProps) => (
  <textarea
    className="ui-multiline-field inline-full mb-4"
    onChange={e => {
      onChange(e.target.value);
    }}
    placeholder={placeholder}
    rows={rows}
    value={value}
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

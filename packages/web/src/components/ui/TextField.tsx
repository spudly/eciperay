import type {TextFieldProps} from '@eciperay/client';
import {TextField as DSTextField} from '@spudly/ui';
import {useState} from 'react';

export const TextField = ({
  value,
  onChange,
  placeholder,
  label,
  type = 'text',
  autoComplete,
  disabled = false,
}: TextFieldProps) => (
  <DSTextField
    value={value}
    onChangeText={onChange}
    placeholder={placeholder}
    label={label}
    autoComplete={autoComplete}
    disabled={disabled}
    type={type}
  />
);

if (import.meta.env.DEV) {
  TextField.demo = function TextFieldDemo() {
    const [value, setValue] = useState('Hello');

    return (
      <TextField
        label="Text field"
        value={value}
        onChange={setValue}
        placeholder="Type here"
      />
    );
  };
}

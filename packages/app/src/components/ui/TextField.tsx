import type {TextFieldProps} from '@eciperay/client';
import {TextField as DsTextField} from '@spudly/ui';
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
  <DsTextField
    label={label}
    value={value}
    onChangeText={onChange}
    placeholder={placeholder}
    autoCapitalize={type === 'email' ? 'none' : 'sentences'}
    autoComplete={autoComplete}
    disabled={disabled}
    keyboardType={type === 'email' ? 'email-address' : 'default'}
    secureTextEntry={type === 'password'}
    accessibilityLabel={label}
  />
);

if (__DEV__) {
  const TextFieldDemo = () => {
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

  TextField.demo = () => <TextFieldDemo />;
}

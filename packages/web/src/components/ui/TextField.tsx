import type {TextFieldProps} from '@eciperay/client';
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
  <div>
    {label ? (
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
        <input
          autoComplete={autoComplete}
          className="ui-text-field inline-full mt-1.5"
          disabled={disabled}
          onChange={e => {
            onChange(e.target.value);
          }}
          placeholder={placeholder}
          type={type}
          value={value}
        />
      </label>
    ) : (
      <input
        autoComplete={autoComplete}
        className="ui-text-field inline-full"
        disabled={disabled}
        onChange={e => {
          onChange(e.target.value);
        }}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    )}
  </div>
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

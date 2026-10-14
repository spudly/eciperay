import type {ColorPickerFieldProps} from '@eciperay/client';
import {useState} from 'react';

export const ColorPickerField = ({
  label,
  value,
  onChange,
  name,
  disabled = false,
}: ColorPickerFieldProps) => (
  <label
    style={{
      display: 'inline-flex',
      flexDirection: 'column',
      gap: 4,
    }}
  >
    {label ? (
      <span style={{fontSize: 14, fontWeight: 500}}>{label}</span>
    ) : null}
    <input
      type="color"
      name={name}
      style={{
        height: 40,
        width: 48,
        cursor: disabled ? 'not-allowed' : 'pointer',
        borderRadius: 4,
        border: '1px solid #d1d5db',
        opacity: disabled ? 0.5 : 1,
      }}
      value={value}
      disabled={disabled}
      onChange={event => {
        onChange(event.target.value);
      }}
    />
  </label>
);

if (import.meta.env.DEV) {
  ColorPickerField.demo = function ColorPickerFieldDemo() {
    const [value, setValue] = useState('#6366f1');

    return (
      <ColorPickerField
        label="Tag color"
        value={value}
        onChange={setValue}
      />
    );
  };
}

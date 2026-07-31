import type {ColorPickerFieldProps} from '@eciperay/client';
import {useState} from 'react';

export const ColorPickerField = ({
  label,
  value,
  onChange,
  name,
  disabled = false,
}: ColorPickerFieldProps) => (
  <label className="inline-flex flex-col gap-1">
    {label ? (
      <span className="text-sm font-medium text-gray-700">{label}</span>
    ) : null}
    <input
      type="color"
      name={name}
      className="ui-color-picker-field"
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

import type {SelectFieldProps} from '@eciperay/client';
import {useState} from 'react';

export const SelectField = ({
  label,
  value,
  onChange,
  options,
  disabled = false,
  id = 'select-field',
}: SelectFieldProps) => (
  <label className="block">
    {label ? (
      <span className="mbe-1 block text-sm font-medium text-gray-700">
        {label}
      </span>
    ) : null}
    <select
      id={id}
      className="
        rounded-xl border border-gray-200 bg-white px-4 py-3 text-base
        inline-full
        disabled:cursor-not-allowed disabled:bg-gray-50
      "
      value={value}
      disabled={disabled}
      onChange={event => {
        onChange(event.target.value);
      }}
    >
      {options.map(option => (
        <option
          key={option.value}
          value={option.value}
        >
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

if (import.meta.env.DEV) {
  SelectField.demo = function SelectFieldDemo() {
    const [value, setValue] = useState('a');

    return (
      <SelectField
        label="Choose one"
        value={value}
        onChange={setValue}
        options={[
          {value: 'a', label: 'Option A'},
          {value: 'b', label: 'Option B'},
        ]}
      />
    );
  };
}

import type {SelectFieldProps} from '@eciperay/client';
import {eciperayTheme, tokens} from '@spudly/ui';
import {useState} from 'react';

// Parity note (design-system#129): the app mirror's showcase demo was
// removed with the in-app component showcase; this web mirror keeps its
// own demo for the web showcase page, so no web change was needed.
export const SelectField = ({
  label,
  value,
  onChange,
  options,
  disabled = false,
  id = 'select-field',
}: SelectFieldProps) => (
  <label style={{display: 'block'}}>
    {label ? (
      <span
        style={{
          display: 'block',
          marginBottom: tokens.spacing[1],
          fontSize: tokens.typography.fontSize.sm,
          fontWeight: tokens.typography.fontWeight.medium,
          color: tokens.colors.gray.gray8,
        }}
      >
        {label}
      </span>
    ) : null}
    <select
      id={id}
      style={{
        borderRadius: 12,
        border: `1px solid ${tokens.colors.gray.gray3}`,
        backgroundColor: disabled
          ? tokens.colors.gray.gray1
          : eciperayTheme.semantic.surface,
        padding: '12px 16px',
        fontSize: tokens.typography.fontSize.md,
        fontFamily: tokens.typography.fontFamily.sans,
        color: tokens.colors.gray.gray10,
        width: '100%',
        boxSizing: 'border-box',
        cursor: disabled ? 'not-allowed' : undefined,
      }}
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

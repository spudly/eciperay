import type {CheckboxFieldProps} from '@eciperay/client';
import {useState} from 'react';

export const CheckboxField = ({
  checked,
  onChange,
  disabled = false,
  label,
  description,
  children,
}: CheckboxFieldProps) => (
  <label className="ui-checkbox-field">
    <input
      type="checkbox"
      className="mt-1"
      checked={checked}
      disabled={disabled}
      onChange={event => {
        onChange(event.target.checked);
      }}
    />
    <span>
      <span className="font-medium text-gray-900">{label}</span>
      {description ? (
        <span className="mt-1 block text-gray-700">{description}</span>
      ) : null}
      {children}
    </span>
  </label>
);

if (import.meta.env.DEV) {
  CheckboxField.demo = function CheckboxFieldDemo() {
    const [checked, setChecked] = useState(true);

    return (
      <CheckboxField
        checked={checked}
        onChange={setChecked}
        label="Enable notifications"
        description="Receive updates about recipe changes."
      />
    );
  };
}

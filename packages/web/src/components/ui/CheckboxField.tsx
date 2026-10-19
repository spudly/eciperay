import type {CheckboxFieldProps} from '@eciperay/client';
import {CheckboxField as DSCheckboxField, Text as DSText} from '@spudly/ui';
import {useState} from 'react';

/**
 * Adapter over the design-system CheckboxField. The DS component only accepts a
 * string description and no children; rich (ReactNode) descriptions and
 * children are rendered below it so no consumer content is lost.
 */
export const CheckboxField = ({
  checked,
  onChange,
  disabled = false,
  label,
  description,
  children,
}: CheckboxFieldProps) => {
  const stringDescription =
    typeof description === 'string' ? description : undefined;
  const richDescription =
    description !== undefined && typeof description !== 'string'
      ? description
      : null;

  return (
    <>
      <DSCheckboxField
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        label={label}
        description={stringDescription}
      />
      {/* Rich descriptions render inside a Text component: React Native
          rejects raw strings under a View (test-renderer enforces this in
          tests). Mirrors the app adapter. */}
      {richDescription ? (
        <DSText variant="hint">{richDescription}</DSText>
      ) : null}
      {children}
    </>
  );
};

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

import type {NumberStepperProps} from '@eciperay/client';
import {NumberStepper as DSNumberStepper} from '@spudly/ui';
import {useState} from 'react';

/**
 * Adapter over the design-system NumberStepper. The DS component has no
 * `disabled` prop; when disabled, min and max are pinned to the current value
 * so both step buttons render disabled.
 */
export const NumberStepper = ({
  label,
  value,
  min = 1,
  onChange,
  disabled = false,
}: NumberStepperProps) => (
  <DSNumberStepper
    label={label}
    value={value}
    onChange={disabled ? () => void 0 : onChange}
    min={disabled ? value : min}
    max={disabled ? value : undefined}
  />
);

if (import.meta.env.DEV) {
  NumberStepper.demo = function NumberStepperDemo() {
    const [value, setValue] = useState(4);

    return (
      <NumberStepper
        label="Servings"
        value={value}
        onChange={setValue}
      />
    );
  };
}

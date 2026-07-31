import type {NumberStepperProps} from '@eciperay/client';
import {useState} from 'react';

export const NumberStepper = ({
  label,
  value,
  min = 1,
  onChange,
  disabled = false,
}: NumberStepperProps) => (
  <div className="ui-number-stepper mb-3 flex">
    <span className="text-sm font-medium text-gray-700">{label}:</span>
    <button
      type="button"
      className="
        ui-number-stepper-button flex
        disabled:opacity-50
      "
      disabled={disabled || value <= min}
      onClick={() => {
        onChange(Math.max(min, value - 1));
      }}
    >
      −
    </button>
    <span className="w-6 text-center text-base font-semibold">{value}</span>
    <button
      type="button"
      className="
        ui-number-stepper-button flex
        disabled:opacity-50
      "
      disabled={disabled}
      onClick={() => {
        onChange(value + 1);
      }}
    >
      +
    </button>
  </div>
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

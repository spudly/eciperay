import type {NumberStepperProps} from '@eciperay/client';
import {NumberStepper as DsNumberStepper} from '@spudly/ui';
import {useState} from 'react';
import {StyleSheet, View} from 'react-native';

const styles = StyleSheet.create({dimmed: {opacity: 0.5}});

export const NumberStepper = ({
  label,
  value,
  min = 1,
  onChange,
  disabled = false,
}: NumberStepperProps) => (
  <View
    className="ui-number-stepper"
    pointerEvents={disabled ? 'none' : 'auto'}
    style={disabled ? styles.dimmed : undefined}
    accessibilityState={{disabled}}
  >
    <DsNumberStepper
      label={label}
      value={value}
      // When disabled, pin min/max to the current value so both DS step
      // buttons render in their disabled state (with proper accessibility
      // semantics), mirroring the web adapter.
      min={disabled ? value : min}
      max={disabled ? value : undefined}
      // DsNumberStepper disables the decrement button at min, but tests (and
      // programmatic presses) can still invoke onChange below min — clamp to
      // preserve this adapter's long-standing contract. Guard while disabled.
      onChange={next => {
        if (disabled) {
          return;
        }
        onChange(Math.max(next, min));
      }}
    />
  </View>
);

if (__DEV__) {
  const NumberStepperDemo = () => {
    const [value, setValue] = useState(4);

    return (
      <NumberStepper
        label="Servings"
        value={value}
        onChange={setValue}
      />
    );
  };

  NumberStepper.demo = () => <NumberStepperDemo />;
}

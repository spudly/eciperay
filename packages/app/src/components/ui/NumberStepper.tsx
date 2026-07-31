import type {NumberStepperProps} from '@eciperay/client';
import {useState} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

export const NumberStepper = ({
  label,
  value,
  min = 1,
  onChange,
  disabled = false,
}: NumberStepperProps) => (
  <View className="ui-number-stepper mb-3 flex-row">
    <Text className="text-sm font-medium text-gray-700">{label}:</Text>
    <TouchableOpacity
      className="ui-number-stepper-button"
      disabled={disabled || value <= min}
      onPress={() => {
        onChange(Math.max(min, value - 1));
      }}
    >
      <Text className="text-lg font-medium">−</Text>
    </TouchableOpacity>
    <Text className="w-6 text-center text-base font-semibold">{value}</Text>
    <TouchableOpacity
      className="ui-number-stepper-button"
      disabled={disabled}
      onPress={() => {
        onChange(value + 1);
      }}
    >
      <Text className="text-lg font-medium">+</Text>
    </TouchableOpacity>
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

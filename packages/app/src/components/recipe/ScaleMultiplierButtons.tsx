import {
  formatScaleMultiplierLabel,
  isActiveScaleMultiplier,
  RECIPE_SCALE_MULTIPLIERS,
  servingsForMultiplier,
} from '@eciperay/client';
import clsx from 'clsx';
import React, {useState} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

type Props = {
  baseServings: number;
  servings: number;
  onServingsChange: (servings: number) => void;
};

export const ScaleMultiplierButtons = ({
  baseServings,
  servings,
  onServingsChange,
}: Props) => (
  <View className="mb-4 flex-row flex-wrap items-center gap-2">
    <Text className="text-sm font-medium text-gray-700">Scale:</Text>
    {RECIPE_SCALE_MULTIPLIERS.map(multiplier => (
      <TouchableOpacity
        key={multiplier}
        className={clsx('rounded-full px-3 py-1', {
          'bg-primary': isActiveScaleMultiplier(
            baseServings,
            servings,
            multiplier,
          ),
          'bg-gray-100': !isActiveScaleMultiplier(
            baseServings,
            servings,
            multiplier,
          ),
        })}
        onPress={() => {
          onServingsChange(servingsForMultiplier(baseServings, multiplier));
        }}
      >
        <Text
          className={clsx('text-sm font-medium', {
            'text-white': isActiveScaleMultiplier(
              baseServings,
              servings,
              multiplier,
            ),
            'text-gray-700': !isActiveScaleMultiplier(
              baseServings,
              servings,
              multiplier,
            ),
          })}
        >
          {formatScaleMultiplierLabel(multiplier)}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

if (__DEV__) {
  const ScaleMultiplierButtonsDemo = () => {
    const [servings, setServings] = useState(4);

    return (
      <ScaleMultiplierButtons
        baseServings={4}
        servings={servings}
        onServingsChange={setServings}
      />
    );
  };

  ScaleMultiplierButtons.demo = () => <ScaleMultiplierButtonsDemo />;
}

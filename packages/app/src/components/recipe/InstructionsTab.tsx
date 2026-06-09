import React, {useState} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import type {RecipeDetail} from '@recipoo/types';

type Props = {recipe: RecipeDetail};

const StepCard = ({
  step,
  isActive,
  onPress,
}: {
  step: RecipeDetail['instructions'][number];
  isActive: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    className={`
      mb-3 rounded-xl border p-4
      ${isActive ? `border-primary bg-primary/5` : `border-gray-100 bg-white`}
    `}
    onPress={onPress}
  >
    <Text
      className={`
        mb-1 text-xs font-semibold
        ${isActive ? 'text-primary' : `text-muted`}
      `}
    >
      Step {step.stepNumber}
    </Text>
    <Text className="text-base text-gray-900">{step.body}</Text>
  </TouchableOpacity>
);

export const InstructionsTab = ({recipe}: Props) => {
  const [activeStep, setActiveStep] = useState(0);
  const sorted = [...recipe.instructions].sort(
    (a, b) => a.stepNumber - b.stepNumber,
  );
  return (
    <View className="p-4">
      {sorted.map((step, i) => (
        <StepCard
          key={step.id}
          step={step}
          isActive={i === activeStep}
          onPress={() => {
            setActiveStep(i);
          }}
        />
      ))}
    </View>
  );
};

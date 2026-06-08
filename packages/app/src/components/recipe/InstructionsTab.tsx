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
    className={`p-4 mb-3 rounded-xl border ${isActive ? 'bg-primary/5 border-primary' : 'bg-white border-gray-100'}`}
    onPress={onPress}
  >
    <Text
      className={`text-xs font-semibold mb-1 ${isActive ? 'text-primary' : 'text-muted'}`}
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

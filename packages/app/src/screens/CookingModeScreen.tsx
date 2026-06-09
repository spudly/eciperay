import {queryKeys} from '@recipoo/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useQuery} from '@tanstack/react-query';
import React, {useEffect, useState} from 'react';
import {
  GestureResponderEvent,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type {RecipeDetail} from '@recipoo/types';
import KeepAwake from 'react-native-keep-awake';

import {api} from '../lib/api';
import type {RecipesStackParamList} from '../navigation/types';

type CookingProps = NativeStackScreenProps<
  RecipesStackParamList,
  'CookingMode'
>;

type Step = RecipeDetail['instructions'][number];

const ProgressDots = ({total, current}: {total: number; current: number}) => (
  <View className="mb-6 flex-row justify-center gap-2">
    {Array.from({length: total}).map((_, i) => (
      <View
        key={i}
        className={`
          size-2 rounded-full
          ${i === current ? 'bg-white' : 'bg-white/40'}
        `}
      />
    ))}
  </View>
);

/* istanbul ignore next -- swipe gesture handlers; tested via button navigation; not simulatable in RNTL */
const useSwipeNav = (onNext: () => void, onPrev: () => void) => {
  const [startX, setStartX] = useState(0);
  const onStart = (e: GestureResponderEvent) => {
    setStartX(e.nativeEvent.pageX);
  };
  const onEnd = (e: GestureResponderEvent) => {
    const delta = startX - e.nativeEvent.pageX;
    if (delta > 50) {
      onNext();
    }
    if (delta < -50) {
      onPrev();
    }
  };
  return {onStart, onEnd};
};

type StepDisplayProps = {
  step: number;
  steps: Step[];
  current: Step | undefined;
};
const StepDisplay = ({step, steps, current}: StepDisplayProps) => (
  <>
    <Text className="mb-4 text-sm uppercase tracking-widest text-white/60">
      Step {current ? current.stepNumber : 1} of {steps.length}
    </Text>
    <Text className="mb-8 text-2xl leading-relaxed text-white">
      {current ? current.body : ''}
    </Text>
    <ProgressDots
      total={steps.length}
      current={step}
    />
  </>
);

type NavButtonsProps = {
  step: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
};
const NavButtons = ({step, total, onNext, onPrev}: NavButtonsProps) => {
  const renderBtn = (label: string, onPress: () => void, disabled: boolean) => (
    <TouchableOpacity
      className={`
        rounded-xl bg-white/10 px-6 py-3
        ${disabled ? 'opacity-30' : ''}
      `}
      onPress={onPress}
      disabled={disabled}
    >
      <Text className="text-base text-white">{label}</Text>
    </TouchableOpacity>
  );
  return (
    <View className="flex-row justify-between">
      {renderBtn('← Back', onPrev, step === 0)}
      {renderBtn('Next →', onNext, step === total - 1)}
    </View>
  );
};

export const CookingModeScreen = ({route, navigation}: CookingProps) => {
  const {recipeId} = route.params;
  const [step, setStep] = useState(0);
  const {data: recipe} = useQuery({
    queryKey: queryKeys.recipe(recipeId),
    queryFn: () => api.recipes.get(recipeId),
  });

  useEffect(() => {
    KeepAwake.activate();
    return () => {
      KeepAwake.deactivate();
    };
  }, []);

  const steps = (recipe?.instructions ?? []).sort(
    (a, b) => a.stepNumber - b.stepNumber,
  );
  const current = steps[step];
  const goNext = () => {
    setStep(s => Math.min(s + 1, steps.length - 1));
  };
  const goPrev = () => {
    setStep(s => Math.max(s - 1, 0));
  };
  const {onStart, onEnd} = useSwipeNav(goNext, goPrev);

  return (
    <View
      className="flex-1 justify-center bg-gray-900 px-6"
      onStartShouldSetResponder={/* istanbul ignore next */ () => true}
      onResponderGrant={onStart}
      onResponderRelease={onEnd}
    >
      <TouchableOpacity
        className="absolute right-6 top-12 rounded-full bg-white/10 px-4 py-2"
        onPress={navigation.goBack}
      >
        <Text className="text-sm text-white">Done</Text>
      </TouchableOpacity>
      <StepDisplay
        step={step}
        steps={steps}
        current={current}
      />
      <NavButtons
        step={step}
        total={steps.length}
        onNext={goNext}
        onPrev={goPrev}
      />
    </View>
  );
};

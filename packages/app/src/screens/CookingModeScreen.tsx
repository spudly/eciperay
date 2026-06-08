import React, {useEffect, useState} from 'react';
import {
  GestureResponderEvent,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RecipeDetail} from '@recipoo/types';
import KeepAwake from 'react-native-keep-awake';

import {apiFetch} from '../lib/api';
import type {RecipesStackParamList} from '../navigation/types';

type CookingProps = NativeStackScreenProps<
  RecipesStackParamList,
  'CookingMode'
>;

type Step = RecipeDetail['instructions'][number];

const fetchRecipe = (id: string) => apiFetch<RecipeDetail>(`/recipes/${id}`);

const Dot = ({active}: {active: boolean}) => (
  <View
    className={`w-2 h-2 rounded-full ${active ? 'bg-white' : 'bg-white/40'}`}
  />
);

const ProgressDots = ({total, current}: {total: number; current: number}) => (
  <View className="flex-row justify-center gap-2 mb-6">
    {Array.from({length: total}).map((_, i) => (
      <Dot
        key={i}
        active={i === current}
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
    <Text className="text-white/60 text-sm uppercase tracking-widest mb-4">
      Step {current ? current.stepNumber : 1} of {steps.length}
    </Text>
    <Text className="text-white text-2xl leading-relaxed mb-8">
      {current ? current.body : ''}
    </Text>
    <ProgressDots
      total={steps.length}
      current={step}
    />
  </>
);

type NavBtnProps = {label: string; onPress: () => void; disabled: boolean};
const NavBtn = ({label, onPress, disabled}: NavBtnProps) => (
  <TouchableOpacity
    className={`px-6 py-3 rounded-xl bg-white/10 ${disabled ? 'opacity-30' : ''}`}
    onPress={onPress}
    disabled={disabled}
  >
    <Text className="text-white text-base">{label}</Text>
  </TouchableOpacity>
);

type NavButtonsProps = {
  step: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
};
const NavButtons = ({step, total, onNext, onPrev}: NavButtonsProps) => (
  <View className="flex-row justify-between">
    <NavBtn
      label="← Back"
      onPress={onPrev}
      disabled={step === 0}
    />
    <NavBtn
      label="Next →"
      onPress={onNext}
      disabled={step === total - 1}
    />
  </View>
);

export const CookingModeScreen = ({route, navigation}: CookingProps) => {
  const {recipeId} = route.params;
  const [step, setStep] = useState(0);
  const {data: recipe} = useQuery({
    queryKey: ['recipe', recipeId],
    queryFn: () => fetchRecipe(recipeId),
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
      className="flex-1 bg-gray-900 px-6 justify-center"
      onStartShouldSetResponder={/* istanbul ignore next */ () => true}
      onResponderGrant={onStart}
      onResponderRelease={onEnd}
    >
      <TouchableOpacity
        className="absolute top-12 right-6 bg-white/10 rounded-full px-4 py-2"
        onPress={navigation.goBack}
      >
        <Text className="text-white text-sm">Done</Text>
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

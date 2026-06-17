import {
  queryKeys,
  resolveRecipeServings,
  scaleFactorFromServings,
} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useQuery} from '@tanstack/react-query';
import React, {useEffect, useState} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import KeepAwake from 'react-native-keep-awake';

import {
  NavButtons,
  StepDisplay,
  useSwipeNav,
} from '../components/cooking/CookingModeParts';
import {api} from '../lib/api';
import type {RecipesStackParamList} from '../navigation/types';

type CookingProps = NativeStackScreenProps<
  RecipesStackParamList,
  'CookingMode'
>;

export const CookingModeScreen = ({route, navigation}: CookingProps) => {
  const {recipeId, servings: servingsOverride} = route.params;
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
  const servings = resolveRecipeServings(
    servingsOverride,
    recipe?.servings ?? 1,
  );
  const scaleFactor = recipe
    ? scaleFactorFromServings(recipe.servings, servings)
    : 1;
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
      onStartShouldSetResponder={
        /* istanbul ignore next -- touch responder required for swipe gestures */
        () => true
      }
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
        recipe={recipe}
        scaleFactor={scaleFactor}
        servings={servings}
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

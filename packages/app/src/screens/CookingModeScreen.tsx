import {
  invalidateRecipeQueries,
  queryKeys,
  resolveRecipeServings,
  scaleFactorFromServings,
} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import React, {useEffect, useState} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import KeepAwake from 'react-native-keep-awake';
import type {CookLogInput} from '@eciperay/types';

import {CookLogForm} from '../components/cooking/CookLogForm';
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
  const {
    recipeId,
    versionId: versionIdParam,
    servings: servingsOverride,
  } = route.params;
  const [step, setStep] = useState(0);
  const [showCookLogForm, setShowCookLogForm] = useState(false);
  const queryClient = useQueryClient();

  const {data: recipe} = useQuery({
    queryKey: queryKeys.recipe(recipeId),
    queryFn: () => api.recipes.get(recipeId),
  });

  const versionId = versionIdParam ?? recipe?.versionId ?? '';

  const {data: versionRecipe} = useQuery({
    queryKey: queryKeys.version(recipeId, versionId),
    queryFn: () => api.versions.get(recipeId, versionId),
    enabled:
      recipeId.length > 0 &&
      versionId.length > 0 &&
      recipe !== undefined &&
      versionId !== recipe.versionId,
  });

  const displayRecipe =
    versionRecipe && recipe
      ? {
          ...recipe,
          title: versionRecipe.title,
          description: versionRecipe.description,
          servings: versionRecipe.servings,
          prepTimeMin: versionRecipe.prepTimeMin,
          cookTimeMin: versionRecipe.cookTimeMin,
          ingredients: versionRecipe.ingredients,
          instructions: versionRecipe.instructions,
          versionId: versionRecipe.id,
        }
      : recipe;

  useEffect(() => {
    KeepAwake.activate();
    return () => {
      KeepAwake.deactivate();
    };
  }, []);

  const steps = [...(displayRecipe?.instructions ?? [])].sort(
    (a, b) => a.stepNumber - b.stepNumber,
  );
  const current = steps[step];
  const servings = resolveRecipeServings(
    servingsOverride,
    displayRecipe?.servings ?? 1,
  );
  const scaleFactor = displayRecipe
    ? scaleFactorFromServings(displayRecipe.servings, servings)
    : 1;

  const cookLogMutation = useMutation({
    mutationFn: (input: CookLogInput) =>
      api.cookLogs.create(recipeId, versionId, input),
    onSuccess: async () => {
      await invalidateRecipeQueries(queryClient, recipeId, versionId);
      navigation.goBack();
    },
  });

  const goNext = () => {
    setStep(s => Math.min(s + 1, steps.length - 1));
  };
  const goPrev = () => {
    setStep(s => Math.max(s - 1, 0));
  };
  const {onStart, onEnd} = useSwipeNav(goNext, goPrev);

  if (showCookLogForm) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-900 px-6">
        <CookLogForm
          isPending={cookLogMutation.isPending}
          onSkip={navigation.goBack}
          onSubmit={input => {
            cookLogMutation.mutate(input);
          }}
        />
      </View>
    );
  }

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
        onPress={() => {
          setShowCookLogForm(true);
        }}
      >
        <Text className="text-sm text-white">Done</Text>
      </TouchableOpacity>
      <StepDisplay
        step={step}
        steps={steps}
        current={current}
        recipe={displayRecipe}
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

import {
  invalidateRecipeQueries,
  queryKeys,
  resolveRecipeServings,
  scaleFactorFromServings,
} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {CookLogForm} from '@spudly/ui';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useEffect, useState} from 'react';
import KeepAwake from 'react-native-keep-awake';
import type {CookLogInput} from '@eciperay/types';

import {
  CookingModeCookLogShell,
  CookingModeDoneButton,
  CookingModeShell,
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
      <CookingModeCookLogShell>
        <CookLogForm
          isPending={cookLogMutation.isPending}
          onSkip={navigation.goBack}
          onSubmit={input => {
            cookLogMutation.mutate(input);
          }}
        />
      </CookingModeCookLogShell>
    );
  }

  return (
    <CookingModeShell
      onResponderGrant={onStart}
      onResponderRelease={onEnd}
    >
      <CookingModeDoneButton
        onPress={() => {
          setShowCookLogForm(true);
        }}
      />
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
    </CookingModeShell>
  );
};

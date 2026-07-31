import {
  invalidateRecipeQueries,
  queryKeys,
  resolveRecipeServings,
  scaleFactorFromServings,
} from '@eciperay/client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useEffect, useState} from 'react';
import {useNavigate, useParams, useSearchParams} from 'react-router-dom';
import type {CookLogInput} from '@eciperay/types';

import {CookLogForm} from '../components/cooking/CookLogForm.js';
import {
  CookingModeCookLogShell,
  CookingModeView,
} from '../components/cooking/CookingModeView.js';
import {eciperay} from '../lib/api.js';

export const CookingModePage = () => {
  const {recipeId = ''} = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [showCookLogForm, setShowCookLogForm] = useState(false);

  const {data: recipe} = useQuery({
    queryKey: queryKeys.recipe(recipeId),
    queryFn: () => eciperay.recipes.get(recipeId),
    enabled: recipeId.length > 0,
  });

  const versionId = searchParams.get('versionId') ?? recipe?.versionId ?? '';

  const {data: versionRecipe} = useQuery({
    queryKey: queryKeys.version(recipeId, versionId),
    queryFn: () => eciperay.versions.get(recipeId, versionId),
    enabled:
      recipeId.length > 0 &&
      versionId.length > 0 &&
      versionId !== recipe?.versionId,
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

  const steps = [...(displayRecipe?.instructions ?? [])].sort(
    (a, b) => a.stepNumber - b.stepNumber,
  );
  const servings = resolveRecipeServings(
    searchParams.get('servings'),
    displayRecipe?.servings ?? 1,
  );
  const scaleFactor = displayRecipe
    ? scaleFactorFromServings(displayRecipe.servings, servings)
    : 1;

  const cookLogMutation = useMutation({
    mutationFn: (input: CookLogInput) =>
      eciperay.cookLogs.create(recipeId, versionId, input),
    onSuccess: async () => {
      await invalidateRecipeQueries(queryClient, recipeId, versionId);
      void navigate(-1);
    },
  });

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (showCookLogForm) {
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setStep(s => Math.min(s + 1, steps.length - 1));
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setStep(s => Math.max(s - 1, 0));
      }
      if (e.key === 'Escape') {
        setShowCookLogForm(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
    };
  }, [steps.length, showCookLogForm]);

  if (showCookLogForm) {
    return (
      <CookingModeCookLogShell>
        <CookLogForm
          isPending={cookLogMutation.isPending}
          onSkip={() => {
            void navigate(-1);
          }}
          onSubmit={input => {
            cookLogMutation.mutate(input);
          }}
        />
      </CookingModeCookLogShell>
    );
  }

  return (
    <CookingModeView
      displayRecipe={displayRecipe}
      steps={steps}
      step={step}
      scaleFactor={scaleFactor}
      servings={servings}
      onDone={() => {
        setShowCookLogForm(true);
      }}
      onPrev={() => {
        setStep(s => Math.max(s - 1, 0));
      }}
      onNext={() => {
        setStep(s => Math.min(s + 1, steps.length - 1));
      }}
    />
  );
};

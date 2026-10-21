import {
  buildMealInputFromForm,
  errorMessage,
  queryKeys,
  recipeFormOptionsQueryOptions,
} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useEffect, useState} from 'react';

import {MealFormView} from '../components/meals/MealFormView';
import {ScreenLoadingGate} from '../components/ScreenLoadingGate';
import {api} from '../lib/api';
import type {MealsStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<MealsStackParamList, 'MealEdit'>;

export const MealEditScreen = ({route, navigation}: Props) => {
  const mealId = route.params.mealId ?? '';
  const isEdit = mealId.length > 0;
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [servingsByRecipeId, setServingsByRecipeId] = useState<
    Record<string, number>
  >({});
  const [formError, setFormError] = useState<string | null>(null);

  const {data: meal, isLoading: mealLoading} = useQuery({
    queryKey: queryKeys.meal(mealId),
    queryFn: () => api.meals.get(mealId),
    enabled: isEdit,
  });

  const {data: recipes = [], isLoading: recipesLoading} = useQuery(
    recipeFormOptionsQueryOptions(params => api.recipes.list(params)),
  );

  useEffect(() => {
    if (!meal) {
      return;
    }
    setTitle(meal.title);
    setNotes(meal.notes ?? '');
    setSelectedRecipeIds(meal.members.map(member => member.recipeId));
    setServingsByRecipeId(
      Object.fromEntries(
        meal.members.map(member => [member.recipeId, member.servings]),
      ),
    );
  }, [meal]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const input = buildMealInputFromForm({
        title,
        notes,
        selectedRecipeIds,
        servingsByRecipeId,
      });
      if (isEdit && mealId) {
        return api.meals.put(mealId, input);
      }
      return api.meals.create(input);
    },
    onSuccess: saved => {
      void queryClient.invalidateQueries({queryKey: queryKeys.meals()});
      void queryClient.invalidateQueries({queryKey: queryKeys.meal(saved.id)});
      navigation.replace('MealDetail', {mealId: saved.id});
    },
    onError: error => {
      setFormError(errorMessage(error));
    },
  });

  const recipeOptions = recipes.map(recipe => ({
    id: recipe.id,
    title: recipe.title,
    servings: recipe.servings,
  }));

  const handleToggleRecipe = (recipeId: string) => {
    setSelectedRecipeIds(previous => {
      if (previous.includes(recipeId)) {
        return previous.filter(id => id !== recipeId);
      }
      const recipe = recipes.find(item => item.id === recipeId);
      /* istanbul ignore next -- checkbox list only toggles ids from recipeOptions */
      if (!recipe) {
        return previous;
      }
      setServingsByRecipeId(current => ({
        ...current,
        [recipeId]: current[recipeId] ?? recipe.servings,
      }));
      return [...previous, recipeId];
    });
  };

  return (
    <ScreenLoadingGate pending={isEdit && (mealLoading || recipesLoading)}>
      <MealFormView
        title={title}
        notes={notes}
        selectedRecipeIds={selectedRecipeIds}
        recipeOptions={recipeOptions}
        servingsByRecipeId={servingsByRecipeId}
        saving={saveMutation.isPending}
        error={formError}
        onTitleChange={setTitle}
        onNotesChange={setNotes}
        onToggleRecipe={handleToggleRecipe}
        onServingsChange={(recipeId, servings) => {
          setServingsByRecipeId(current => ({
            ...current,
            [recipeId]: servings,
          }));
        }}
        onSubmit={() => {
          setFormError(null);
          saveMutation.mutate();
        }}
      />
    </ScreenLoadingGate>
  );
};

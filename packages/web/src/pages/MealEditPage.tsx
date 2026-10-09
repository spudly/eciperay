import {
  buildMealInputFromForm,
  errorMessage,
  queryKeys,
} from '@eciperay/client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';

import {MealFormView} from '../components/meals/MealFormView.js';
import {ScreenLoadingGate} from '../components/ScreenLoadingGate.js';
import {eciperay} from '../lib/api.js';

export const MealEditPage = () => {
  const {mealId = ''} = useParams();
  const isEdit = mealId.length > 0;
  const navigate = useNavigate();
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
    queryFn: () => eciperay.meals.get(mealId),
    enabled: isEdit,
  });

  const {data: recipes = [], isLoading: recipesLoading} = useQuery({
    queryKey: queryKeys.recipes({sort: 'newest', sortDir: 'desc'}),
    queryFn: () => eciperay.recipes.list({limit: 100}),
  });

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
        return eciperay.meals.put(mealId, input);
      }
      return eciperay.meals.create(input);
    },
    onSuccess: saved => {
      void queryClient.invalidateQueries({queryKey: queryKeys.meals()});
      void queryClient.invalidateQueries({queryKey: queryKeys.meal(saved.id)});
      void navigate(`/meals/${saved.id}`);
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
      /* c8 ignore next 3 -- checkbox list only toggles ids from recipeOptions */
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

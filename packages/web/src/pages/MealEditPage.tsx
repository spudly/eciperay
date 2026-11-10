import {
  buildMealInputFromForm,
  errorMessage,
  mealIngredientsToForm,
  queryKeys,
  recipeFormSearchQueryOptions,
  useDebouncedValue,
  type MealFormIngredient,
} from '@eciperay/client';
import {MealFormPage as MealFormPageView} from '@spudly/ui';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useEffect, useRef, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';

import {ScreenLoadingGate} from '../components/ScreenLoadingGate.js';
import {eciperay} from '../lib/api.js';

type SelectedRecipe = {id: string; label: string; servings: number};

export const MealEditPage = () => {
  const {mealId = ''} = useParams();
  const isEdit = mealId.length > 0;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  // The selected recipes' view-models, in selection order: under the
  // search autocomplete (#359) a selected recipe need not be in the
  // current search results, so the selection carries its own label and
  // servings instead of looking them up in a full-library option list.
  const [selectedRecipes, setSelectedRecipes] = useState<SelectedRecipe[]>([]);
  const [servingsByRecipeId, setServingsByRecipeId] = useState<
    Record<string, number>
  >({});
  // Direct ingredients entered on the meal itself (#362), as form rows:
  // quantity / unit / servings stay free-text until buildMealInputFromForm
  // parses them at save time.
  const [formIngredients, setFormIngredients] = useState<MealFormIngredient[]>(
    [],
  );
  const nextIngredientId = useRef(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebouncedValue(searchText);

  const {data: meal, isLoading: mealLoading} = useQuery({
    queryKey: queryKeys.meal(mealId),
    queryFn: () => eciperay.meals.get(mealId),
    enabled: isEdit,
  });

  const {
    data: searchResults = [],
    isFetching: isSearching,
    error: searchError,
  } = useQuery({
    ...recipeFormSearchQueryOptions(
      (params, signal) => eciperay.recipes.list(params, signal),
      debouncedSearch,
    ),
    enabled: debouncedSearch.trim().length > 0,
  });

  useEffect(() => {
    if (!meal) {
      return;
    }
    setTitle(meal.title);
    setNotes(meal.notes ?? '');
    setSelectedRecipes(
      meal.members.map(member => ({
        id: member.recipeId,
        label: member.title,
        servings: member.recipeServings,
      })),
    );
    setServingsByRecipeId(
      Object.fromEntries(
        meal.members.map(member => [member.recipeId, member.servings]),
      ),
    );
    setFormIngredients(mealIngredientsToForm(meal.ingredients ?? []));
  }, [meal]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const input = buildMealInputFromForm({
        title,
        notes,
        selectedRecipeIds: selectedRecipes.map(recipe => recipe.id),
        servingsByRecipeId,
        formIngredients,
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

  const handleSelectRecipe = (recipeId: string) => {
    const recipe = searchResults.find(item => item.id === recipeId);
    if (!recipe || selectedRecipes.some(item => item.id === recipeId)) {
      return;
    }
    setSelectedRecipes(previous => [
      ...previous,
      {id: recipe.id, label: recipe.title, servings: recipe.servings},
    ]);
    setServingsByRecipeId(current => ({
      ...current,
      [recipeId]: current[recipeId] ?? recipe.servings,
    }));
  };

  const handleRemoveRecipe = (recipeId: string) => {
    setSelectedRecipes(previous =>
      previous.filter(recipe => recipe.id !== recipeId),
    );
  };

  return (
    <ScreenLoadingGate pending={isEdit && mealLoading}>
      <MealFormPageView
        title={title}
        notes={notes}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        searchResults={searchResults.map(recipe => ({
          id: recipe.id,
          label: recipe.title,
          servings: recipe.servings,
        }))}
        isSearching={isSearching || debouncedSearch !== searchText}
        selectedRecipes={selectedRecipes}
        servingsByRecipeId={servingsByRecipeId}
        ingredients={formIngredients}
        onAddIngredient={() => {
          nextIngredientId.current += 1;
          setFormIngredients(previous => [
            ...previous,
            {
              id: `new-ingredient-${nextIngredientId.current}`,
              name: '',
              quantity: '',
              unit: '',
              servings: '1',
            },
          ]);
        }}
        onRemoveIngredient={ingredientId => {
          setFormIngredients(previous =>
            previous.filter(ingredient => ingredient.id !== ingredientId),
          );
        }}
        onIngredientChange={(ingredientId, patch) => {
          setFormIngredients(previous =>
            previous.map(ingredient =>
              ingredient.id === ingredientId
                ? {...ingredient, ...patch}
                : ingredient,
            ),
          );
        }}
        isSaving={saveMutation.isPending}
        error={
          formError ??
          // A failed picker search must not read as "no matches":
          // surface it in the form's error slot instead (#359).
          (searchError
            ? `Could not load recipes: ${errorMessage(searchError)}`
            : null)
        }
        onTitleChange={setTitle}
        onNotesChange={setNotes}
        onSelectRecipe={handleSelectRecipe}
        onRemoveRecipe={handleRemoveRecipe}
        onServingsChange={(recipeId, servings) => {
          // The retired web view's NumberStepper adapter clamped at a
          // minimum of 1; the DS page's stepper is unbounded and the
          // server schema rejects 0 servings, so the clamp lives in
          // the host callback (the C8 host-validation precedent).
          setServingsByRecipeId(current => ({
            ...current,
            [recipeId]: Math.max(1, servings),
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

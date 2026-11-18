import {
  buildMealInputFromForm,
  errorMessage,
  mealIngredientsToForm,
  queryKeys,
  recipeFormSearchQueryOptions,
  useDebouncedValue,
  type MealFormIngredient,
} from '@eciperay/client';
import {useLingui} from '@lingui/react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {MealFormPage} from '@spudly/ui';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useEffect, useRef, useState} from 'react';

import {ScreenLoadingGate} from '../components/ScreenLoadingGate';
import {api} from '../lib/api';
import type {MealsStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<MealsStackParamList, 'MealEdit'>;

type SelectedRecipe = {id: string; label: string; servings: number};

export const MealEditScreen = ({route, navigation}: Props) => {
  const {i18n} = useLingui();
  const mealId = route.params.mealId ?? '';
  const isEdit = mealId.length > 0;
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
  // Servings-to-eat per recipe (#363), carried alongside the cook
  // values: @spudly/ui 11's MealFormPage renders its own eat stepper
  // (DS #659), so eat is edited directly; it only defaults to cook
  // when a recipe is first selected.
  const [servingsToEatByRecipeId, setServingsToEatByRecipeId] = useState<
    Record<string, number>
  >({});
  // Direct ingredients entered on the meal itself (#362), as form rows:
  // quantity / unit / servings stay free-text until buildMealInputFromForm
  // parses them at save time — the web MealEditPage wiring, mirrored here.
  const [formIngredients, setFormIngredients] = useState<MealFormIngredient[]>(
    [],
  );
  const nextIngredientId = useRef(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebouncedValue(searchText);

  const {
    data: meal,
    isLoading: mealLoading,
    error: mealError,
    isLoadingError: isMealLoadingError,
  } = useQuery({
    queryKey: queryKeys.meal(mealId),
    queryFn: () => api.meals.get(mealId),
    enabled: isEdit,
  });

  // A failed initial load in edit mode must not leave an empty,
  // saveable form: the save is a full replace, so submitting it would
  // wipe the meal's stored recipes and direct ingredients (#362 — the
  // web MealEditPage gate, mirrored here). The load error shows in the
  // form's error slot and saving stays blocked until a meal is loaded.
  // A failed background refetch is different: the cached meal is still
  // present, so the form (and its edits) stays usable.
  const mealLoadFailed = isEdit && isMealLoadingError && !meal;
  const mealLoadErrorMessage = mealLoadFailed
    ? i18n._({
        id: 'mealForm.loadMealError',
        message: 'Could not load this meal: {error}',
        values: {error: errorMessage(mealError)},
      })
    : null;

  const {
    data: searchResults = [],
    isFetching: isSearching,
    error: searchError,
  } = useQuery({
    ...recipeFormSearchQueryOptions(
      (params, signal) => api.recipes.list(params, signal),
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
        meal.members.map(member => [member.recipeId, member.servingsToCook]),
      ),
    );
    setServingsToEatByRecipeId(
      Object.fromEntries(
        meal.members.map(member => [member.recipeId, member.servingsToEat]),
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
        servingsToEatByRecipeId,
        formIngredients,
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
    // Eat defaults to cook when an entry is added (#363).
    setServingsToEatByRecipeId(current => ({
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
      <MealFormPage
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
        servingsToEatByRecipeId={servingsToEatByRecipeId}
        onServingsToEatChange={(recipeId, servings) => {
          setServingsToEatByRecipeId(current => ({
            ...current,
            [recipeId]: Math.max(0, servings),
          }));
        }}
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
              // Blank servings-to-eat defaults to servings-to-cook
              // at parse time (#363).
              servingsToEat: '',
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
            previous.map(ingredient => {
              if (ingredient.id !== ingredientId) {
                return ingredient;
              }
              // The DS form (ui 11, DS #659) edits servings-to-eat
              // through its own field, so a cook edit no longer
              // rewrites eat; a blank eat still defaults to the cook
              // value at parse time (#363).
              return {...ingredient, ...patch};
            }),
          );
        }}
        isSaving={saveMutation.isPending}
        error={
          formError ??
          mealLoadErrorMessage ??
          // Same picker-error surfacing as web (#359): a failed
          // search must not read as "no matches".
          (searchError
            ? i18n._({
                id: 'mealForm.loadRecipesError',
                message: 'Could not load recipes: {error}',
                values: {error: errorMessage(searchError)},
              })
            : null)
        }
        onTitleChange={setTitle}
        onNotesChange={setNotes}
        onSelectRecipe={handleSelectRecipe}
        onRemoveRecipe={handleRemoveRecipe}
        onServingsChange={(recipeId, servings) => {
          // Eat is edited through its own stepper now (ui 11) and no
          // longer follows cook edits.
          setServingsByRecipeId(current => ({
            ...current,
            [recipeId]: Math.max(0, servings),
          }));
        }}
        onSubmit={() => {
          if (mealLoadFailed) {
            // Never submit the empty form over a meal that failed to
            // load — the full-replace save would wipe its stored
            // recipes and direct ingredients. The error slot already
            // shows the derived load message, so just block: storing
            // it in formError would freeze its text (and locale) past
            // a successful refetch.
            return;
          }
          setFormError(null);
          saveMutation.mutate();
        }}
      />
    </ScreenLoadingGate>
  );
};

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

import {RouteErrorView} from '../components/RouteErrorView.js';
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
  // Servings-to-eat per recipe (#363), carried alongside the cook
  // values the DS form's stepper edits: the DS MealFormPage (9.2.x)
  // has no eat stepper, so eat defaults to cook on selection and
  // follows a cook edit while it still equals the previous cook value
  // (a stored eat that differs from cook is preserved).
  const [servingsToEatByRecipeId, setServingsToEatByRecipeId] = useState<
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

  const {
    data: meal,
    isLoading: mealLoading,
    error: mealError,
  } = useQuery({
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

  // Hydrate the form once per meal: a background refetch of the same
  // meal must not overwrite rows the user has already edited. The guard
  // is keyed by meal id, so navigating to a different meal hydrates
  // that meal's values afresh.
  const hydratedMealIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!meal || hydratedMealIdRef.current === meal.id) {
      return;
    }
    hydratedMealIdRef.current = meal.id;
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
    // Eat defaults to cook when an entry is added (#363).
    setServingsToEatByRecipeId(current => ({
      ...current,
      [recipeId]: current[recipeId] ?? recipe.servings,
    }));
  };

  // A failed initial load in edit mode must not leave an empty,
  // saveable form: the save is a full replace, so submitting it would
  // wipe the meal's stored recipes and ingredients. Show the load
  // error instead — there is nothing safe to edit until the meal
  // loads. (Create mode has no load and is unaffected.) A failed
  // background refetch is different: the cached meal is still present,
  // so keep the form (and its edits) rather than hiding it.
  if (isEdit && mealError && !meal) {
    return (
      <RouteErrorView
        isNotFound={
          mealError instanceof Error &&
          (mealError.message === 'Meal not found' ||
            mealError.message.startsWith('API error 404'))
        }
      />
    );
  }

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
              const merged = {...ingredient, ...patch};
              // Servings-to-eat follows a servings-to-cook edit
              // while it is blank or still equals the previous cook
              // value (#363); a divergent stored eat is preserved —
              // the DS form has no separate eat control.
              if (
                patch.servings !== undefined &&
                (ingredient.servingsToEat === '' ||
                  ingredient.servingsToEat === ingredient.servings)
              ) {
                merged.servingsToEat = patch.servings;
              }
              return merged;
            }),
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
          const nextCook = Math.max(1, servings);
          // Eat follows a cook edit while it still equals the old
          // cook value (#363); a divergent stored eat is preserved.
          setServingsToEatByRecipeId(current => ({
            ...current,
            [recipeId]:
              current[recipeId] === undefined ||
              current[recipeId] === servingsByRecipeId[recipeId]
                ? nextCook
                : current[recipeId],
          }));
          setServingsByRecipeId(current => ({
            ...current,
            [recipeId]: nextCook,
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

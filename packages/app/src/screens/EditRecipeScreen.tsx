import {
  invalidateRecipeQueries,
  queryKeys,
  recipeDetailToInput,
} from '@eciperay/client';
import {useLingui} from '@lingui/react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {EditRecipePage} from '@spudly/ui';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import type {RecipeInput} from '@eciperay/types';

import {RecipeForm} from '../hosts/recipe/RecipeForm';
import {ScreenLoadingGate} from '../components/ScreenLoadingGate';
import {eciperay} from '../lib/api';
import type {RecipesStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<RecipesStackParamList, 'EditRecipe'>;

export const EditRecipeScreen = ({route, navigation}: Props) => {
  const {i18n} = useLingui();
  const {recipeId} = route.params;
  const queryClient = useQueryClient();

  const {data: recipe, isLoading} = useQuery({
    queryKey: queryKeys.recipe(recipeId),
    queryFn: () => eciperay.recipes.get(recipeId),
    enabled: recipeId.length > 0,
  });

  const handleSubmit = async (input: RecipeInput) => {
    await eciperay.recipes.put(recipeId, input);
    await invalidateRecipeQueries(queryClient, recipeId, recipe?.versionId);
    navigation.navigate('RecipeDetail', {recipeId});
  };

  if (isLoading || !recipe) {
    return <ScreenLoadingGate pending>{null}</ScreenLoadingGate>;
  }

  return (
    <EditRecipePage>
      <RecipeForm
        initial={recipeDetailToInput(recipe)}
        recipeId={recipeId}
        contentLocked
        submitLabel={i18n._({
          id: 'recipeForm.submitSaveChanges',
          message: 'Save Changes',
        })}
        onSubmit={handleSubmit}
      />
    </EditRecipePage>
  );
};

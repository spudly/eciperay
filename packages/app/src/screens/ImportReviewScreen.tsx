import {errorMessage, queryKeys, recipeDetailToInput} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {ImportReviewPage} from '@spudly/ui/pages';
import {RecipeInputPreview} from '../components/recipe/RecipeInputPreview';
import {ScreenLoadingGate} from '../components/ScreenLoadingGate';
import {api} from '../lib/api';
import type {AddStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<AddStackParamList, 'ImportReview'>;

export const ImportReviewScreen = ({route, navigation}: Props) => {
  const {recipeId} = route.params;
  const queryClient = useQueryClient();

  const {data: recipe, isLoading} = useQuery({
    queryKey: queryKeys.recipe(recipeId),
    queryFn: () => api.recipes.get(recipeId),
    enabled: recipeId.length > 0,
  });

  const acceptMutation = useMutation({
    mutationFn: () => api.recipes.acceptImport(recipeId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.recipe(recipeId),
      });
      navigation
        .getParent()
        ?.navigate('Recipes', {screen: 'RecipeDetail', params: {recipeId}});
    },
  });

  const startEditsMutation = useMutation({
    mutationFn: () => api.versions.startImportEdits(recipeId),
    onSuccess: async version => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.recipe(recipeId),
      });
      navigation
        .getParent()
        ?.navigate('Recipes', {
          screen: 'EditVersion',
          params: {recipeId, versionId: version.id},
        });
    },
  });

  const busy = acceptMutation.isPending || startEditsMutation.isPending;
  const error =
    acceptMutation.error || startEditsMutation.error
      ? errorMessage(acceptMutation.error ?? startEditsMutation.error)
      : null;

  if (isLoading || !recipe) {
    return <ScreenLoadingGate pending>{null}</ScreenLoadingGate>;
  }

  const preview = recipeDetailToInput(recipe);
  const versionLabel = recipe.versionNumber ? `v${recipe.versionNumber}` : 'v1';

  return (
    <ImportReviewPage
      versionLabel={versionLabel}
      imageUrl={recipe.imageUrl}
      preview={<RecipeInputPreview recipe={preview} />}
      error={error}
      busy={busy}
      acceptPending={acceptMutation.isPending}
      editsPending={startEditsMutation.isPending}
      onAccept={() => {
        acceptMutation.mutate();
      }}
      onStartEdits={() => {
        startEditsMutation.mutate();
      }}
    />
  );
};

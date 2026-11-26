import {
  errorMessage,
  queryKeys,
  recipeDetailToInput,
  recipePreviewViewData,
} from '@eciperay/client';
import {CommonActions} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {ImportReviewPage} from '@spudly/ui';
import {ScreenLoadingGate} from '../components/ScreenLoadingGate';
import {eciperay} from '../lib/api';
import type {AddStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<AddStackParamList, 'ImportReview'>;

export const ImportReviewScreen = ({route, navigation}: Props) => {
  const {recipeId} = route.params;
  const queryClient = useQueryClient();

  const {data: recipe, isLoading} = useQuery({
    queryKey: queryKeys.recipe(recipeId),
    queryFn: () => eciperay.recipes.get(recipeId),
    enabled: recipeId.length > 0,
  });

  // Leaving the import flow for the Recipes tab completes the import
  // session: reset the Add stack to its root so a later tap on the Add tab
  // starts a fresh import instead of resurrecting this review (#533).
  // Guarded: if this review already left the Add stack while the mutation
  // was in flight, a stale completion must not reset the stack out from
  // under a newer screen (e.g. a fresh ManualEntry form).
  const resetAddStack = () => {
    const stillInStack = navigation
      .getState()
      .routes.some(stackRoute => stackRoute.key === route.key);
    if (!stillInStack) {
      return;
    }
    navigation.dispatch(
      CommonActions.reset({index: 0, routes: [{name: 'AddScreen'}]}),
    );
  };

  const acceptMutation = useMutation({
    mutationFn: () => eciperay.recipes.acceptImport(recipeId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.recipe(recipeId),
      });
      resetAddStack();
      navigation
        .getParent()
        ?.navigate('Recipes', {screen: 'RecipeDetail', params: {recipeId}});
    },
  });

  const startEditsMutation = useMutation({
    mutationFn: () => eciperay.versions.startImportEdits(recipeId),
    onSuccess: async version => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.recipe(recipeId),
      });
      resetAddStack();
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
      preview={recipePreviewViewData(preview)}
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

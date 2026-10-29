import {errorMessage, queryKeys, recipeDetailToInput} from '@eciperay/client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useNavigate, useParams} from 'react-router-dom';

import {ImportReviewPage as ImportReviewPageView} from '@spudly/ui/pages';

import {RecipeInputPreview} from '../components/recipe/RecipeInputPreview.js';
import {ScreenLoadingGate} from '../components/ScreenLoadingGate.js';
import {eciperay} from '../lib/api.js';

export const ImportReviewPage = () => {
  const {recipeId = ''} = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {data: recipe, isLoading} = useQuery({
    queryKey: queryKeys.recipe(recipeId),
    queryFn: () => eciperay.recipes.get(recipeId),
    enabled: recipeId.length > 0,
  });

  const acceptMutation = useMutation({
    mutationFn: () => eciperay.recipes.acceptImport(recipeId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.recipe(recipeId),
      });
      void navigate(`/recipes/${recipeId}`);
    },
  });

  const startEditsMutation = useMutation({
    mutationFn: () => eciperay.versions.startImportEdits(recipeId),
    onSuccess: async version => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.recipe(recipeId),
      });
      void navigate(`/recipes/${recipeId}/versions/${version.id}/edit`);
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
    <ImportReviewPageView
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

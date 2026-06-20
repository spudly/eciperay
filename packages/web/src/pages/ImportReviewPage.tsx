import {errorMessage, queryKeys, recipeDetailToInput} from '@eciperay/client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useNavigate, useParams} from 'react-router-dom';

import {RecipeInputPreview} from '../components/recipe/RecipeInputPreview.js';
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
    return <p>Loading…</p>;
  }

  const preview = recipeDetailToInput(recipe);
  const versionLabel = recipe.versionNumber ? `v${recipe.versionNumber}` : 'v1';

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Review Import</h1>
      <p className="text-muted mb-4 text-sm">
        This is your imported recipe ({versionLabel}). Looks good, or make edits
        to create a draft version.
      </p>
      {recipe.imageUrl ? (
        <img
          src={recipe.imageUrl}
          alt={recipe.title}
          className="mb-4 max-h-64 w-full rounded-xl object-cover"
        />
      ) : null}
      <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <RecipeInputPreview recipe={preview} />
      </div>
      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          className="
            bg-primary rounded-lg px-4 py-3 text-sm font-semibold text-white
            disabled:opacity-50
          "
          onClick={() => {
            acceptMutation.mutate();
          }}
        >
          {acceptMutation.isPending ? 'Saving…' : 'Looks good'}
        </button>
        <button
          type="button"
          disabled={busy}
          className="
            rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium
            text-gray-700
            disabled:opacity-50
          "
          onClick={() => {
            startEditsMutation.mutate();
          }}
        >
          {startEditsMutation.isPending ? 'Creating draft…' : 'Make edits'}
        </button>
      </div>
    </div>
  );
};

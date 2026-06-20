import {
  invalidateRecipeQueries,
  queryKeys,
  recipeVersionDetailToInput,
} from '@eciperay/client';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {useNavigate, useParams} from 'react-router-dom';
import type {RecipeVersionInput} from '@eciperay/types';

import {RecipeForm} from '../components/recipe/RecipeForm.js';
import {eciperay} from '../lib/api.js';

export const EditVersionPage = () => {
  const {recipeId = '', versionId = ''} = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {data: version, isLoading} = useQuery({
    queryKey: queryKeys.version(recipeId, versionId),
    queryFn: () => eciperay.versions.get(recipeId, versionId),
    enabled: recipeId.length > 0 && versionId.length > 0,
  });

  const parentVersionId = version?.derivedFromVersionId ?? '';

  const {data: parentVersion} = useQuery({
    queryKey: queryKeys.version(recipeId, parentVersionId),
    queryFn: () => eciperay.versions.get(recipeId, parentVersionId),
    enabled: recipeId.length > 0 && parentVersionId.length > 0,
  });

  const handleSubmit = async (input: RecipeVersionInput) => {
    await eciperay.versions.put(recipeId, versionId, input);
    await invalidateRecipeQueries(queryClient, recipeId, versionId);
    void navigate(`/recipes/${recipeId}?versionId=${versionId}`);
  };

  if (isLoading || !version) {
    return <p>Loading…</p>;
  }

  if (!version.isEditable) {
    return (
      <div>
        <p className="text-red-600">This version can no longer be edited.</p>
        <button
          type="button"
          className="text-primary mt-4 text-sm underline"
          onClick={() => {
            void navigate(`/recipes/${recipeId}`);
          }}
        >
          Back to recipe
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        Edit Draft (v{version.versionNumber})
      </h1>
      {version.createdVia === 'import_review' && parentVersion ? (
        <p
          className="
            mb-4 rounded-lg bg-indigo-50 px-4 py-3 text-sm text-indigo-950
          "
        >
          Editing draft (v{version.versionNumber}) based on imported v
          {parentVersion.versionNumber}.
        </p>
      ) : null}
      {version.changeSummary ? (
        <p className="text-muted mb-6 text-sm">{version.changeSummary}</p>
      ) : null}
      <RecipeForm
        initial={recipeVersionDetailToInput(version)}
        recipeId={recipeId}
        parentVersion={parentVersion}
        submitLabel="Save Draft"
        onSubmit={handleSubmit}
      />
    </div>
  );
};

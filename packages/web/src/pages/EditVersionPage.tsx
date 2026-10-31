import {
  invalidateRecipeQueries,
  queryKeys,
  recipeVersionDetailToInput,
} from '@eciperay/client';
import {EditVersionPage as EditVersionShell} from '@spudly/ui/pages';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {useNavigate, useParams} from 'react-router-dom';
import type {RecipeVersionInput} from '@eciperay/types';

import {ScreenLoadingGate} from '../components/ScreenLoadingGate.js';
import {eciperay} from '../lib/api.js';

import {RecipeFormHost} from './RecipeFormHost.js';

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
    return <ScreenLoadingGate pending>{null}</ScreenLoadingGate>;
  }

  return (
    <EditVersionShell
      versionNumber={version.versionNumber}
      changeSummary={version.changeSummary}
      showImportBanner={
        version.createdVia === 'import_review' && parentVersion !== undefined
      }
      parentVersionNumber={parentVersion?.versionNumber}
      notEditable={!version.isEditable}
      backHref={`/recipes/${recipeId}`}
    >
      <RecipeFormHost
        initial={recipeVersionDetailToInput(version)}
        recipeId={recipeId}
        parentVersion={parentVersion}
        submitLabel="Save Draft"
        onSubmit={handleSubmit}
      />
    </EditVersionShell>
  );
};

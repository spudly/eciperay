import {
  invalidateRecipeQueries,
  queryKeys,
  recipeVersionDetailToInput,
} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {EditVersionPage} from '@spudly/ui/pages';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import type {RecipeVersionInput} from '@eciperay/types';

import {RecipeForm} from '../components/recipe/RecipeForm';
import {ScreenLoadingGate} from '../components/ScreenLoadingGate';
import {api} from '../lib/api';
import type {RecipesStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<RecipesStackParamList, 'EditVersion'>;

export const EditVersionScreen = ({route, navigation}: Props) => {
  const {recipeId, versionId} = route.params;
  const queryClient = useQueryClient();

  const {data: version, isLoading} = useQuery({
    queryKey: queryKeys.version(recipeId, versionId),
    queryFn: () => api.versions.get(recipeId, versionId),
    enabled: recipeId.length > 0 && versionId.length > 0,
  });

  const parentVersionId = version?.derivedFromVersionId ?? '';

  const {data: parentVersion} = useQuery({
    queryKey: queryKeys.version(recipeId, parentVersionId),
    queryFn: () => api.versions.get(recipeId, parentVersionId),
    enabled: recipeId.length > 0 && parentVersionId.length > 0,
  });

  const handleSubmit = async (input: RecipeVersionInput) => {
    await api.versions.put(recipeId, versionId, input);
    await invalidateRecipeQueries(queryClient, recipeId, versionId);
    navigation.navigate('RecipeDetail', {recipeId, versionId});
  };

  if (isLoading || !version) {
    return <ScreenLoadingGate pending>{null}</ScreenLoadingGate>;
  }

  return (
    <EditVersionPage
      versionNumber={version.versionNumber}
      changeSummary={version.changeSummary}
      showImportBanner={
        version.createdVia === 'import_review' && parentVersion !== undefined
      }
      parentVersionNumber={parentVersion?.versionNumber}
      notEditable={!version.isEditable}
      onBack={() => {
        navigation.navigate('RecipeDetail', {recipeId});
      }}
    >
      <RecipeForm
        initial={recipeVersionDetailToInput(version)}
        recipeId={recipeId}
        parentVersion={parentVersion}
        submitLabel="Save Draft"
        onSubmit={handleSubmit}
      />
    </EditVersionPage>
  );
};

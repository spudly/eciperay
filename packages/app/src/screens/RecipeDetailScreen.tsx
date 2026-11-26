import {
  queryKeys,
  recordRecipeView,
  removeRecipeView,
  useDeleteRecipe,
} from '@eciperay/client';
import type {RecipeDetail} from '@eciperay/types';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {Alert} from 'react-native';

import {RecipeDetailView} from '../hosts/recipe/RecipeDetailView';
import {ScreenLoadingGate} from '../components/ScreenLoadingGate';
import {eciperay} from '../lib/api';
import {mergeVersionIntoRecipe} from '../lib/mergeVersionIntoRecipe';
import {recipeViewHistoryStorage} from '../lib/recipeViewHistoryStorage';
import type {RecipesStackParamList} from '../navigation/types';

type DetailProps = NativeStackScreenProps<
  RecipesStackParamList,
  'RecipeDetail'
>;

export const RecipeDetailScreen = ({route, navigation}: DetailProps) => {
  const {recipeId, versionId: initialVersionId} = route.params;
  const [servings, setServings] = useState<number | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    initialVersionId ?? null,
  );
  const queryClient = useQueryClient();
  // Deletion itself is the shared useDeleteRecipe (#676); the RN
  // Alert confirmation stays here at the host's edge.
  const {deleteRecipe} = useDeleteRecipe(eciperay, recipeId, {
    onDeleted: () => {
      navigation.navigate('RecipesList');
    },
    removeFromHistory: () =>
      removeRecipeView(recipeViewHistoryStorage, recipeId),
  });
  const confirmDelete = (recipe: RecipeDetail) => {
    Alert.alert('Delete recipe', `Delete "${recipe.title}"?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteRecipe();
        },
      },
    ]);
  };

  const invalidateRecentlyViewed = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.recipes('home-recently-viewed'),
    });
  }, [queryClient]);

  useEffect(() => {
    void recordRecipeView(recipeViewHistoryStorage, recipeId).then(() => {
      invalidateRecentlyViewed();
    });
  }, [recipeId, invalidateRecentlyViewed]);

  const {data: recipe, isLoading} = useQuery({
    queryKey: queryKeys.recipe(recipeId),
    queryFn: () => eciperay.recipes.get(recipeId),
  });

  const activeVersionId = selectedVersionId ?? recipe?.versionId ?? '';

  const {data: versions = []} = useQuery({
    queryKey: queryKeys.versions(recipeId),
    queryFn: () => eciperay.versions.list(recipeId),
    enabled: recipeId.length > 0,
  });

  const viewingAlternateVersion =
    recipe !== undefined && activeVersionId !== recipe.versionId;

  const {data: versionDetail} = useQuery({
    queryKey: queryKeys.version(recipeId, activeVersionId),
    queryFn: () => eciperay.versions.get(recipeId, activeVersionId),
    enabled: recipeId.length > 0 && viewingAlternateVersion,
  });

  const displayRecipe = useMemo(() => {
    if (!recipe) {
      return null;
    }
    if (viewingAlternateVersion && versionDetail) {
      return mergeVersionIntoRecipe(recipe, versionDetail);
    }
    return recipe;
  }, [recipe, viewingAlternateVersion, versionDetail]);

  useEffect(() => {
    if (route.params.versionId) {
      setSelectedVersionId(route.params.versionId);
      navigation.setParams({versionId: undefined});
    }
  }, [navigation, route.params.versionId]);

  useEffect(() => {
    setServings(null);
  }, [activeVersionId]);

  // The app's loading gate (with its delayed spinner) stays app-side, as
  // the page's contract documents: the view only ever receives the ready
  // state, and a missing recipe stays on the gate — the screen has no
  // distinct not-found UI.
  if (isLoading || !recipe || !displayRecipe) {
    return <ScreenLoadingGate pending>{null}</ScreenLoadingGate>;
  }

  const currentServings = servings ?? displayRecipe.servings;
  const scaleFactor = currentServings / displayRecipe.servings;

  return (
    <RecipeDetailView
      recipe={recipe}
      displayRecipe={displayRecipe}
      versions={versions}
      selectedVersionId={activeVersionId}
      onSelectVersion={setSelectedVersionId}
      currentServings={currentServings}
      scaleFactor={scaleFactor}
      onServingsChange={setServings}
      onDelete={() => {
        confirmDelete(recipe);
      }}
      onViewVersion={versionId => {
        setSelectedVersionId(versionId);
      }}
      onEditVersion={versionId => {
        navigation.navigate('EditVersion', {recipeId: recipe.id, versionId});
      }}
    />
  );
};

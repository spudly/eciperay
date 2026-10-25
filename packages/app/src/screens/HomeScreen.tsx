import {
  HOME_ADD_LABEL,
  HOME_BROWSE_LABEL,
  HOME_EMPTY_MESSAGE,
  HOME_RECIPES_SECTION_TITLE,
  HOME_SHARED_WITH_ME_LABEL,
  HOME_SUBTITLE,
  HOME_TITLE,
  homeRecentlyViewedRecipesQueryOptions,
  queryKeys,
  removeRecipeView,
} from '@eciperay/client';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {useFocusEffect} from '@react-navigation/native';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useCallback} from 'react';
import {Alert} from 'react-native';
import type {RecipeDetail} from '@eciperay/types';

import {HomePage} from '@spudly/ui/pages';

import {RecipeListCard} from '../components/RecipeListCard';
import {api} from '../lib/api';
import {recipeViewHistoryStorage} from '../lib/recipeViewHistoryStorage';
import type {RootTabParamList} from '../navigation/types';

type Props = BottomTabScreenProps<RootTabParamList, 'Home'>;

export const HomeScreen = ({navigation}: Props) => {
  const queryClient = useQueryClient();

  useFocusEffect(
    useCallback(() => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.recipes('home-recently-viewed'),
      });
    }, [queryClient]),
  );

  const {data: recipes = [], isLoading} = useQuery(
    homeRecentlyViewedRecipesQueryOptions(
      id => api.recipes.get(id),
      recipeViewHistoryStorage,
    ),
  );

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.recipes.delete(id);
      await removeRecipeView(recipeViewHistoryStorage, id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.recipes('home-recently-viewed'),
      });
    },
  });

  const confirmDelete = (recipe: RecipeDetail) => {
    Alert.alert('Delete recipe', `Delete "${recipe.title}"?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteMutation.mutate(recipe.id);
        },
      },
    ]);
  };

  const openRecipe = (recipeId: string) => {
    navigation.navigate('Recipes', {
      screen: 'RecipeDetail',
      params: {recipeId},
    });
  };

  const recipesById = new Map(recipes.map(recipe => [recipe.id, recipe]));

  return (
    <HomePage
      title={HOME_TITLE}
      subtitle={HOME_SUBTITLE}
      browseLabel={HOME_BROWSE_LABEL}
      addLabel={HOME_ADD_LABEL}
      sharedWithMeLabel={HOME_SHARED_WITH_ME_LABEL}
      recipesTitle={HOME_RECIPES_SECTION_TITLE}
      emptyMessage={HOME_EMPTY_MESSAGE}
      isLoading={isLoading}
      recipes={recipes.map(recipe => ({id: recipe.id}))}
      renderRecipeRow={row => {
        const recipe = recipesById.get(row.id);
        if (!recipe) {
          return null;
        }
        return (
          <RecipeListCard
            recipe={recipe}
            onPress={() => {
              openRecipe(recipe.id);
            }}
            onDelete={() => {
              confirmDelete(recipe);
            }}
          />
        );
      }}
      onBrowsePress={() => {
        navigation.navigate('Recipes', {screen: 'RecipesList'});
      }}
      onAddPress={() => {
        navigation.navigate('Add', {screen: 'AddScreen'});
      }}
      onSharedWithMePress={() => {
        navigation.navigate('Recipes', {screen: 'SharedWithMe'});
      }}
    />
  );
};

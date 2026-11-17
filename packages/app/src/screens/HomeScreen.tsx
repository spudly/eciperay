import {
  formatCondensedNutritionParts,
  formatSatietyLabel,
  formatServingsLabel,
  getDisplayRating,
  HOME_ADD_LABEL,
  HOME_BROWSE_LABEL,
  HOME_EMPTY_MESSAGE,
  HOME_RECIPES_SECTION_TITLE,
  HOME_SHARED_WITH_ME_LABEL,
  HOME_SUBTITLE,
  HOME_TITLE,
  homeRecentlyViewedRecipesQueryOptions,
  queryKeys,
} from '@eciperay/client';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {useFocusEffect} from '@react-navigation/native';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {useCallback, useState} from 'react';
import type {RecipeDetail} from '@eciperay/types';

import {HomePage} from '@spudly/ui';

import {InlineCookLogForm} from '../hosts/recipes/RecipesListView';
import {api} from '../lib/api';
import {
  addHref,
  recipeHref,
  recipesHref,
  sharedWithMeHref,
} from '../lib/deepLinks';
import {recipeViewHistoryStorage} from '../lib/recipeViewHistoryStorage';
import type {RootTabParamList} from '../navigation/types';

type Props = BottomTabScreenProps<RootTabParamList, 'Home'>;

/**
 * The subtitle for a Home recently-viewed row: the same composition the Recipes
 * page rows use (servings · time · condensed nutrition · satiety, no rating
 * segment — the DS page renders the rating itself as the row's log-cook
 * stars).
 */
const formatHomeRecipeSubtitle = (recipe: RecipeDetail) =>
  `${formatServingsLabel(recipe.servings)}${recipe.cookTimeMin ? ` · ${recipe.cookTimeMin} min` : ''} · ${[
    ...formatCondensedNutritionParts(recipe),
    formatSatietyLabel(recipe.satietyScore, recipe.nutritionStatus),
  ].join(' · ')}`;

export const HomeScreen = (_props: Props) => {
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

  // The row whose log-cook form is open (#532): pressing a row's
  // stars in the DS page opens the form host-side under the page,
  // reusing the Recipes list's inline form composition.
  const [openCookLogId, setOpenCookLogId] = useState<string | null>(null);
  const openRecipe = recipes.find(recipe => recipe.id === openCookLogId);

  return (
    <>
      <HomePage
        title={HOME_TITLE}
        subtitle={HOME_SUBTITLE}
        browseLabel={HOME_BROWSE_LABEL}
        addLabel={HOME_ADD_LABEL}
        sharedWithMeLabel={HOME_SHARED_WITH_ME_LABEL}
        recipesTitle={HOME_RECIPES_SECTION_TITLE}
        emptyMessage={HOME_EMPTY_MESSAGE}
        loading={isLoading}
        recipes={recipes.map(recipe => ({
          id: recipe.id,
          href: recipeHref(recipe),
          title: recipe.title,
          subtitle: formatHomeRecipeSubtitle(recipe),
          rating: getDisplayRating(recipe),
          imageUrl: recipe.imageUrl,
        }))}
        onLogCookPress={recipeId => {
          setOpenCookLogId(recipeId);
        }}
        browseHref={recipesHref}
        addHref={addHref}
        sharedWithMeHref={sharedWithMeHref}
      />
      {openRecipe ? (
        <InlineCookLogForm
          key={openRecipe.id}
          recipe={openRecipe}
          onClose={() => {
            setOpenCookLogId(null);
          }}
        />
      ) : null}
    </>
  );
};

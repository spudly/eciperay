import {
  formatCondensedNutritionParts,
  formatSatietyLabel,
  formatServingsLabel,
  getDisplayRating,
  homeRecentlyViewedRecipesQueryOptions,
  queryKeys,
} from '@eciperay/client';
import {useLingui} from '@lingui/react';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {useFocusEffect} from '@react-navigation/native';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {useCallback, useState} from 'react';
import type {RecipeDetail} from '@eciperay/types';

import {HomePage} from '@spudly/ui';

import {InlineCookLogForm} from '../hosts/recipes/RecipesListView';
import {eciperay} from '../lib/api';
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

// The Home screen's page-unique copy flows through the Lingui catalogs
// (#465 tranche 6: explicit ids `home.title` / `home.subtitle` /
// `home.browseLabel` / `home.addLabel` / `home.sharedWithMeLabel` /
// `home.recipesSectionTitle` / `home.emptyMessage`) instead of the
// shared `@eciperay/client` homeCopy constants — the same ids the web
// HomePage resolves from its own catalogs.
export const HomeScreen = (_props: Props) => {
  const {i18n} = useLingui();
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
      id => eciperay.recipes.get(id),
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
        title={i18n._({id: 'home.title', message: 'Welcome to Eciperay'})}
        subtitle={i18n._({
          id: 'home.subtitle',
          message: 'Everything you’re cooking, all in one place',
        })}
        browseLabel={i18n._({
          id: 'home.browseLabel',
          message: 'Browse Recipes',
        })}
        addLabel={i18n._({id: 'home.addLabel', message: 'Add Recipe'})}
        sharedWithMeLabel={i18n._({
          id: 'home.sharedWithMeLabel',
          message: 'Shared with me',
        })}
        recipesTitle={i18n._({
          id: 'home.recipesSectionTitle',
          message: 'Recently viewed',
        })}
        emptyMessage={i18n._({
          id: 'home.emptyMessage',
          message: 'Nothing here yet — recipes you peek at will line up here for next time.',
        })}
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

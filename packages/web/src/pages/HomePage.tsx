import {
  buildRecipePath,
  formatCondensedNutritionParts,
  formatSatietyLabel,
  formatServingsLabel,
  getDisplayRating,
  homeRecentlyViewedRecipesQueryOptions,
  invalidateRecipeQueries,
} from '@eciperay/client';
import type {CookLogInput, RecipeDetail} from '@eciperay/types';
import {useLingui} from '@lingui/react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';

import {HomePage as HomePageView} from '@spudly/ui';

import {CookLogForm} from '../components/cooking/CookLogForm.js';
import {eciperay} from '../lib/api.js';
import {recipeViewHistoryStorage} from '../lib/recipeViewHistoryStorage.js';

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

/**
 * The cook-log form for a Home row whose stars were pressed (#532): DS HomePage
 * renders the shared recipe rows and reports the press through onLogCookPress;
 * the form itself stays host-side, rendered under the page for the one open
 * recipe. Its submit values are already a CookLogInput, so they cross to the
 * mutation unchanged.
 */
const HomeCookLogForm = ({
  recipe,
  onClose,
}: {
  recipe: RecipeDetail;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: (input: CookLogInput) =>
      eciperay.cookLogs.create(recipe.id, recipe.versionId, input),
    onSuccess: async () => {
      await invalidateRecipeQueries(queryClient, recipe.id, recipe.versionId);
      onClose();
    },
  });
  return (
    <CookLogForm
      variant="light"
      isPending={createMutation.isPending}
      onSkip={() => {
        if (!createMutation.isPending) {
          onClose();
        }
      }}
      onSubmit={input => {
        createMutation.mutate(input);
      }}
    />
  );
};

// The Home page's page-unique copy flows through the Lingui catalogs
// (#465 tranche 6: explicit ids `home.title` / `home.subtitle` /
// `home.browseLabel` / `home.addLabel` / `home.sharedWithMeLabel` /
// `home.recipesSectionTitle` / `home.emptyMessage`) instead of the
// shared `@eciperay/client` homeCopy constants.
export const HomePage = () => {
  const {i18n} = useLingui();
  const {data: recipes = [], isLoading} = useQuery(
    homeRecentlyViewedRecipesQueryOptions(
      id => eciperay.recipes.get(id),
      recipeViewHistoryStorage,
    ),
  );

  // The row whose log-cook form is open (#532): pressing a row's
  // stars in the DS page opens the form host-side under the page.
  const [openCookLogId, setOpenCookLogId] = useState<string | null>(null);
  const openRecipe = recipes.find(recipe => recipe.id === openCookLogId);

  return (
    <>
      <HomePageView
        title={i18n._({id: 'home.title', message: 'Welcome to Eciperay'})}
        subtitle={i18n._({
          id: 'home.subtitle',
          message: 'Your personal recipe collection',
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
          message: 'Recipes you view will appear here.',
        })}
        loading={isLoading}
        recipes={recipes.map(recipe => ({
          id: recipe.id,
          href: buildRecipePath(recipe),
          title: recipe.title,
          subtitle: formatHomeRecipeSubtitle(recipe),
          rating: getDisplayRating(recipe),
          imageUrl: recipe.imageUrl,
        }))}
        onLogCookPress={recipeId => {
          setOpenCookLogId(recipeId);
        }}
        browseHref="/recipes"
        addHref="/add"
        sharedWithMeHref="/recipes"
      />
      {openRecipe ? (
        <HomeCookLogForm
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

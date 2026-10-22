import type {
  RecipeStatusFilterValue,
  RecipesListViewProps,
} from '@eciperay/client';
import {
  demoRecipeListFilters,
  invalidateRecipeQueries,
  makeRecipeDetail,
} from '@eciperay/client';
import type {
  CookLogInput,
  RecipeDetail,
  RecipeListSort,
  RecipeListSortDir,
} from '@eciperay/types';
import {RecipesPage, type RecipesPageItem} from '@spudly/ui/pages';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useEffect, useRef, useState} from 'react';

import {api} from '../../lib/api';
import {CookLogForm} from '../cooking/CookLogForm';
import {formatRecipeSubtitle} from '../RecipeListCard';

/**
 * The Recipes screen's view (#49, stage 2): the design system's RecipesPage
 * renders the screen — filter bar, bounded list, rows — and this component is
 * its app-side host. Everything the page must not own stays here: the
 * view-model mapping (the subtitle is the app's list meta line, formatted by
 * the same helper the list card uses), the boundary adaptations (delete
 * resolves the recipe from the app's own list by id, because the confirmation
 * alert needs the full recipe; the filter unions narrow back from the page's
 * plain strings with the same casts the old filter bar used), and the cook-log
 * composition below.
 *
 * The layout regressions the old hand-rolled list guarded in this file — #188
 * (bounded flex: 1 list, filters as its header) and #162 (the DS SearchField
 * untouched) — are structural in the DS page now; the view tests here still pin
 * the rendered contract (bounded scroll view, header filters, element
 * presence).
 */

/**
 * One row's inline cook-log form, rendered through the page's per-row accessory
 * slot. It mirrors RecipeListCard's form block — same mutation, same
 * invalidation, same close-on-success — with the open state lifted to the
 * view's open set instead of per-card state. The page wraps the accessory in
 * the same bottom-margin stack the card wrapped its form in.
 *
 * One card behavior needs explicit care here: the card's mutation lives in the
 * always-mounted card body, so cancelling mid-save merely hid the form — the
 * pending mutation (and its disabled Save) survived a close/reopen. This
 * component unmounts with the slot instead, so a cancel during a pending save
 * would orphan the in-flight request and let a reopened form save a duplicate.
 * Cancel is therefore inert while the save is pending: the form stays open
 * until the save settles (success closes it; an error re-enables Cancel).
 *
 * The same lifetime argument applies to the page's list virtualization: the
 * FlatList unmounts rows scrolled far off screen, and an unmounted card
 * returned closed because its open state died with it. The lifted set would
 * survive the unmount, so this form reconciles on the way out — its unmount
 * cleanup removes its id from the open set — and a row that scrolls back
 * returns closed, as the card did. (A save still in flight at unmount keeps the
 * card's own exposure: the request is not cancelled, only the form and its
 * state are gone; what the reconcile prevents is the row remounting with a
 * fresh empty form already open on top of it.)
 *
 * Exported for the unmount-reconciliation tests; the view is its only
 * production caller.
 */
export const InlineCookLogForm = ({
  recipe,
  onClose,
}: {
  recipe: RecipeDetail;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (input: CookLogInput) =>
      api.cookLogs.create(recipe.id, recipe.versionId, input),
    onSuccess: async () => {
      await invalidateRecipeQueries(queryClient, recipe.id, recipe.versionId);
      onClose();
    },
  });

  // The latest onClose, for the unmount cleanup below: the host passes a
  // fresh closure on every render, so the cleanup cannot depend on the
  // prop itself without firing on every render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(
    () => () => {
      onCloseRef.current();
    },
    [],
  );

  return (
    <CookLogForm
      variant="light"
      secondaryLabel="Cancel"
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

export const RecipesListView = ({
  isLoading,
  recipes,
  isFetchingNextPage,
  onRecipePress,
  onRecipeDelete,
  onLoadMore,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  ingredient,
  onIngredientChange,
  minCalories,
  onMinCaloriesChange,
  maxCalories,
  onMaxCaloriesChange,
  minSatiety,
  onMinSatietyChange,
  maxSatiety,
  onMaxSatietyChange,
  sort,
  onSortChange,
  sortDir,
  onSortDirChange,
  showStatusFilter,
}: RecipesListViewProps) => {
  // The cook-log forms' open state: a set of recipe ids, so forms
  // open and close independently and several may be open at once —
  // the same semantics the cards' per-card state gave this screen.
  // The page hides the "Log cook" button of any row whose accessory
  // renders content, so opening a form here is all it takes to
  // reproduce the card's button-hides-while-open behavior.
  const [openCookLogIds, setOpenCookLogIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const openCookLog = (recipeId: string) => {
    setOpenCookLogIds(current => new Set(current).add(recipeId));
  };

  const closeCookLog = (recipeId: string) => {
    setOpenCookLogIds(current => {
      if (!current.has(recipeId)) {
        return current;
      }
      const next = new Set(current);
      next.delete(recipeId);
      return next;
    });
  };

  // Reconcile the open set with the rows actually in the list: when a
  // recipe leaves the list (filtered out, or the loading-to-empty
  // transition), its open id goes with it, so a recipe that later
  // returns comes back closed. The cards got this for free — unmounting
  // a card discarded its open state — but the lifted set has to prune
  // explicitly, or a returning row would reopen a fresh empty form and
  // hide its "Log cook" button.
  useEffect(() => {
    setOpenCookLogIds(current => {
      if (current.size === 0) {
        return current;
      }
      const present = new Set(recipes.map(recipe => recipe.id));
      const next = new Set(
        [...current].filter(recipeId => present.has(recipeId)),
      );
      return next.size === current.size ? current : next;
    });
  }, [recipes]);

  const recipesById = new Map(recipes.map(recipe => [recipe.id, recipe]));

  const items: RecipesPageItem[] = recipes.map(recipe => ({
    id: recipe.id,
    title: recipe.title,
    subtitle: formatRecipeSubtitle(recipe),
    imageUrl: recipe.imageUrl,
  }));

  return (
    <RecipesPage
      recipes={items}
      isLoading={isLoading}
      isFetchingNextPage={isFetchingNextPage}
      onRecipePress={onRecipePress}
      onLogCookPress={openCookLog}
      onRecipeDelete={recipeId => {
        const recipe = recipesById.get(recipeId);
        if (recipe) {
          onRecipeDelete(recipe);
        }
      }}
      renderRecipeAccessory={recipeId => {
        const recipe = recipesById.get(recipeId);
        if (!recipe || !openCookLogIds.has(recipeId)) {
          return null;
        }
        return (
          <InlineCookLogForm
            key={recipeId}
            recipe={recipe}
            onClose={() => {
              closeCookLog(recipeId);
            }}
          />
        );
      }}
      onLoadMore={onLoadMore}
      search={search}
      onSearchChange={onSearchChange}
      statusFilter={statusFilter}
      onStatusFilterChange={
        onStatusFilterChange
          ? value => {
              onStatusFilterChange(value as RecipeStatusFilterValue);
            }
          : undefined
      }
      showStatusFilter={showStatusFilter}
      ingredient={ingredient}
      onIngredientChange={onIngredientChange}
      minCalories={minCalories}
      onMinCaloriesChange={onMinCaloriesChange}
      maxCalories={maxCalories}
      onMaxCaloriesChange={onMaxCaloriesChange}
      minSatiety={minSatiety}
      onMinSatietyChange={onMinSatietyChange}
      maxSatiety={maxSatiety}
      onMaxSatietyChange={onMaxSatietyChange}
      sort={sort}
      onSortChange={value => {
        onSortChange(value as RecipeListSort);
      }}
      sortDir={sortDir}
      onSortDirChange={value => {
        onSortDirChange(value as RecipeListSortDir);
      }}
    />
  );
};

if (__DEV__) {
  const RecipesListViewDemo = () => {
    const [search, setSearch] = useState('');

    return (
      <RecipesListView
        {...demoRecipeListFilters()}
        search={search}
        onSearchChange={setSearch}
        isLoading={false}
        recipes={[makeRecipeDetail()]}
        isFetchingNextPage={false}
        onRecipePress={() => {
          void 0;
        }}
        onRecipeDelete={() => {
          void 0;
        }}
        onLoadMore={() => {
          void 0;
        }}
      />
    );
  };

  RecipesListView.demo = () => <RecipesListViewDemo />;
}

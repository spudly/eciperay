/* eslint-disable max-lines -- recipe overview with primary actions and lifecycle controls */
import {
  canEditActiveRecipeMetadata,
  canEditDraftVersion,
  invalidateRecipeQueries,
  makeRecipeDetail,
  makeRecipeVersionSummary,
  queryKeys,
  removeRecipeView,
  useAnalytics,
  type ShowcaseDemoRenderer,
} from '@eciperay/client';
import type {RecipeDetail, RecipeVersionSummary} from '@eciperay/types';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';

import {eciperay} from '../../lib/api.js';
import {printRecipe} from '../../lib/printRecipe.js';
import {recipeViewHistoryStorage} from '../../lib/recipeViewHistoryStorage.js';
import {shareRecipe} from '../../lib/shareRecipe.js';
import {StatBadge, StatBadgeRow} from '../ui/StatBadge.js';
import {TagPill} from '../ui/TagPill.js';

import {OverviewActions} from './OverviewActions.js';
import {RecipeStatusBadge} from './RecipeStatusBadge.js';
import {RecipeVisibilityControls} from './RecipeVisibilityControls.js';

type Props = {
  recipe: RecipeDetail;
  activeVersionId: string;
  servings: number;
  versions: RecipeVersionSummary[];
};

export const OverviewTab = ({
  recipe,
  activeVersionId,
  servings,
  versions,
}: Props) => {
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const analytics = useAnalytics();
  // Delete control (#263): the web detail page had none, while the app
  // detail wires one through the DS page's onDeletePress. It follows
  // the list card's in-page two-step confirmation (never
  // window.confirm) and surfaces failures instead of failing silently.
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await eciperay.recipes.delete(recipe.id);
      // History cleanup is best-effort: the server delete already
      // succeeded, so a storage failure must not route to onError.
      await removeRecipeView(recipeViewHistoryStorage, recipe.id).catch(
        () => undefined,
      );
    },
    onSuccess: () => {
      analytics.track('recipe_deleted', {recipe_id: recipe.id});
      void invalidateRecipeQueries(queryClient, recipe.id, recipe.versionId);
      void navigate('/recipes');
      // Drop the deleted recipe's detail cache too, so navigating back
      // to its detail URL cannot render the stale cached recipe (#273).
      // Runs after navigate so this page does not flash its not-found
      // state on the way out.
      queryClient.removeQueries({
        queryKey: queryKeys.recipe(recipe.id),
      });
    },
    onError: error => {
      setDeleteError(
        `Could not delete recipe: ${
          error instanceof Error ? error.message : 'Recipe deletion failed'
        }`,
      );
    },
  });

  const canEditDraft = canEditDraftVersion(recipe.versionId, versions);
  const canEditMetadata = canEditActiveRecipeMetadata(
    recipe.status,
    recipe.versionId,
    activeVersionId,
    versions,
  );

  const showActionMessage = (message: string) => {
    setActionMessage(message);
    window.setTimeout(() => {
      setActionMessage(null);
    }, 2500);
  };

  const handleShare = async () => {
    try {
      const result = await shareRecipe(recipe);
      showActionMessage(
        result === 'copied' ? 'Recipe copied to clipboard' : 'Recipe shared',
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      showActionMessage('Could not share recipe');
    }
  };

  return (
    <div className="p-4">
      {recipe.imageUrl ? (
        <img
          src={recipe.imageUrl}
          alt={recipe.title}
          className="
            mbe-4 rounded-xl bg-gray-50 object-contain inline-full max-block-64
          "
        />
      ) : null}
      <h2 className="mbe-2 text-2xl font-bold text-gray-900">{recipe.title}</h2>
      <div className="mbe-4">
        <RecipeStatusBadge status={recipe.status} />
      </div>
      {recipe.description ? (
        <p className="mbe-4 text-gray-600">{recipe.description}</p>
      ) : null}
      <StatBadgeRow>
        <StatBadge
          label="Servings"
          value={String(recipe.servings)}
        />
        {recipe.prepTimeMin ? (
          <StatBadge
            label="Prep"
            value={`${recipe.prepTimeMin}m`}
          />
        ) : null}
        {recipe.cookTimeMin ? (
          <StatBadge
            label="Cook"
            value={`${recipe.cookTimeMin}m`}
          />
        ) : null}
      </StatBadgeRow>
      <div className="mbe-4 flex gap-3">
        <Link
          to={`/recipes/${recipe.id}/cook?versionId=${recipe.versionId}&servings=${servings}`}
          className="
            bg-primary flex-1 rounded-xl py-3 text-center font-semibold
            text-white
          "
        >
          Start Cooking
        </Link>
        <button
          type="button"
          className="rounded-xl bg-gray-100 text-gray-700 inline-12"
          onClick={() => {
            printRecipe(recipe);
          }}
        >
          🖨
        </button>
        <button
          type="button"
          aria-label="Share recipe"
          className="rounded-xl bg-gray-100 text-gray-700 inline-12"
          onClick={() => {
            void handleShare();
          }}
        >
          ↗
        </button>
        {canEditMetadata ? (
          <Link
            to={`/recipes/${recipe.id}/edit`}
            className="
              rounded-xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700
            "
          >
            Edit
          </Link>
        ) : null}
        {canEditDraft ? (
          <Link
            to={`/recipes/${recipe.id}/versions/${recipe.versionId}/edit`}
            className="
              rounded-xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700
            "
          >
            Edit draft
          </Link>
        ) : null}
        {confirmingDelete ? (
          <>
            <button
              type="button"
              className="
                rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white
                disabled:opacity-50
              "
              disabled={deleteMutation.isPending}
              onClick={() => {
                setDeleteError(null);
                deleteMutation.mutate();
              }}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Confirm delete'}
            </button>
            <button
              type="button"
              className="
                rounded-xl bg-gray-100 px-4 py-3 text-sm font-medium
                text-gray-700
                disabled:opacity-50
              "
              disabled={deleteMutation.isPending}
              onClick={() => {
                setConfirmingDelete(false);
              }}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            className="
              rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600
            "
            onClick={() => {
              setConfirmingDelete(true);
            }}
          >
            Delete
          </button>
        )}
      </div>
      {deleteError ? (
        <p
          role="alert"
          className="mbe-4 text-sm text-red-600"
        >
          {deleteError}
        </p>
      ) : null}
      {actionMessage ? (
        <p
          role="status"
          className="mbe-4 text-center text-sm text-gray-600"
        >
          {actionMessage}
        </p>
      ) : null}
      <OverviewActions
        recipe={recipe}
        versions={versions}
        onActionMessage={showActionMessage}
        activeVersionId={activeVersionId}
      />
      <RecipeVisibilityControls
        recipe={recipe}
        onActionMessage={showActionMessage}
      />
      <div className="flex flex-wrap gap-2">
        {recipe.tags.map(tag => (
          <TagPill
            key={tag.id}
            name={tag.name}
            color={tag.color}
          />
        ))}
      </div>
    </div>
  );
};

if (import.meta.env.DEV) {
  const OverviewTabDemo = () => {
    const recipe = makeRecipeDetail();
    return (
      <OverviewTab
        recipe={recipe}
        activeVersionId={recipe.versionId}
        servings={recipe.servings}
        versions={[makeRecipeVersionSummary()]}
      />
    );
  };

  const overviewTabDemo: ShowcaseDemoRenderer = ({Frame}) => (
    <Frame>
      <OverviewTabDemo />
    </Frame>
  );
  OverviewTab.demo = overviewTabDemo;
}

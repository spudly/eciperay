/* eslint-disable max-lines -- recipe overview with primary actions and lifecycle controls */
import {
  canEditActiveRecipeMetadata,
  canEditDraftVersion,
  makeRecipeDetail,
  makeRecipeVersionSummary,
  type ShowcaseDemoRenderer,
} from '@eciperay/client';
import type {RecipeDetail, RecipeVersionSummary} from '@eciperay/types';
import {useState} from 'react';
import {Link} from 'react-router-dom';

import {printRecipe} from '../../lib/printRecipe.js';
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
      </div>
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

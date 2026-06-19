import type {RecipeDetail, RecipeVersionSummary} from '@eciperay/types';
import {useState} from 'react';
import {Link} from 'react-router-dom';

import {printRecipe} from '../../lib/printRecipe.js';
import {shareRecipe} from '../../lib/shareRecipe.js';

import {OverviewActions} from './OverviewActions.js';

type Props = {
  recipe: RecipeDetail;
  servings: number;
  versions: RecipeVersionSummary[];
};

const StatBadge = ({label, value}: {label: string; value: string}) => (
  <div className="text-center">
    <p className="text-base font-semibold text-gray-900">{value}</p>
    <p className="text-muted text-xs">{label}</p>
  </div>
);

export const OverviewTab = ({recipe, servings, versions}: Props) => {
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const viewingVersion = versions.find(v => v.id === recipe.versionId);
  const canEditDraft = viewingVersion?.isEditable ?? false;

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
          className="mb-4 max-h-64 w-full rounded-xl bg-gray-50 object-contain"
        />
      ) : null}
      <h2 className="mb-2 text-2xl font-bold text-gray-900">{recipe.title}</h2>
      {recipe.description ? (
        <p className="mb-4 text-gray-600">{recipe.description}</p>
      ) : null}
      <div className="mb-4 flex justify-around rounded-xl bg-gray-50 py-4">
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
      </div>
      <div className="mb-4 flex gap-3">
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
          className="w-12 rounded-xl bg-gray-100 text-gray-700"
          onClick={() => {
            printRecipe(recipe);
          }}
        >
          🖨
        </button>
        <button
          type="button"
          aria-label="Share recipe"
          className="w-12 rounded-xl bg-gray-100 text-gray-700"
          onClick={() => {
            void handleShare();
          }}
        >
          ↗
        </button>
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
          className="mb-4 text-center text-sm text-gray-600"
        >
          {actionMessage}
        </p>
      ) : null}
      <OverviewActions
        recipe={recipe}
        versions={versions}
        onActionMessage={showActionMessage}
      />
      <div className="flex flex-wrap gap-2">
        {recipe.tags.map(tag => (
          <span
            key={tag.id}
            className="rounded-full px-3 py-1 text-xs font-medium"
            style={{backgroundColor: `${tag.color}22`, color: tag.color}}
          >
            {tag.name}
          </span>
        ))}
      </div>
    </div>
  );
};

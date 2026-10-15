import type {PublicRecipeDetail} from '@eciperay/types';

import {StatBadge, StatBadgeRow} from '../ui/StatBadge.js';
import {TagPill} from '../ui/TagPill.js';

import {RecipeStatusBadge} from './RecipeStatusBadge.js';

type Props = {recipe: PublicRecipeDetail};

export const PublicRecipeOverview = ({recipe}: Props) => {
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

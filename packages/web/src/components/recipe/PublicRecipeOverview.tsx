import type {PublicRecipeDetail} from '@eciperay/types';

import {DevelopmentStatusBadge} from './DevelopmentStatusBadge.js';

type Props = {recipe: PublicRecipeDetail};

const StatBadge = ({label, value}: {label: string; value: string}) => (
  <div className="text-center">
    <p className="text-base font-semibold text-gray-900">{value}</p>
    <p className="text-muted text-xs">{label}</p>
  </div>
);

export const PublicRecipeOverview = ({recipe}: Props) => {
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
      <div className="mb-4">
        <DevelopmentStatusBadge status={recipe.developmentStatus} />
      </div>
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

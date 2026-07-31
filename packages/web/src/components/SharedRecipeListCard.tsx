import {Link} from 'react-router-dom';
import type {RecipeDetail} from '@eciperay/types';
import {makeRecipeDetail} from '@eciperay/client';
import type {ComponentType} from 'react';
import type {ShowcaseFrameProps} from '@eciperay/client';

const RecipeThumbnail = ({recipe}: {recipe: RecipeDetail}) =>
  recipe.imageUrl ? (
    <img
      src={recipe.imageUrl}
      alt={recipe.title}
      className="size-16 shrink-0 rounded-lg bg-gray-50 object-cover"
    />
  ) : (
    <div
      aria-hidden
      className="size-16 shrink-0 rounded-lg bg-gray-100"
    />
  );

type SharedRecipeListCardProps = {recipe: RecipeDetail};

export const SharedRecipeListCard = ({recipe}: SharedRecipeListCardProps) => (
  <Link
    to={`/recipe/${recipe.id}/${recipe.slug}`}
    className="mb-3 flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm"
  >
    <RecipeThumbnail recipe={recipe} />
    <div className="min-w-0 flex-1">
      <p className="text-base font-semibold text-gray-900">{recipe.title}</p>
      <p className="text-muted mt-1 text-sm">
        {recipe.servings} servings
        {recipe.cookTimeMin ? ` · ${recipe.cookTimeMin} min` : ''}
      </p>
    </div>
  </Link>
);

if (import.meta.env.DEV) {
  SharedRecipeListCard.demo = function SharedRecipeListCardDemo({
    Frame,
  }: {
    Frame: ComponentType<ShowcaseFrameProps>;
  }) {
    const mockRecipe = makeRecipeDetail();

    return (
      <Frame>
        <SharedRecipeListCard recipe={mockRecipe} />
      </Frame>
    );
  };
}

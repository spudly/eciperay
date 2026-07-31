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

type RecipeListCardProps = {
  recipe: RecipeDetail;
  onDelete: (id: string) => void;
  onPress?: () => void;
};

const RecipeDetails = ({recipe}: {recipe: RecipeDetail}) => (
  <>
    <p className="text-base font-semibold text-gray-900">{recipe.title}</p>
    <p className="text-muted mt-1 text-sm">
      {recipe.servings} servings
      {recipe.cookTimeMin ? ` · ${recipe.cookTimeMin} min` : ''}
    </p>
  </>
);

export const RecipeListCard = ({
  recipe,
  onDelete,
  onPress,
}: RecipeListCardProps) => (
  <div
    className="mb-3 flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm"
  >
    {onPress ? (
      <>
        <button
          type="button"
          className="shrink-0 border-0 bg-transparent p-0"
          onClick={onPress}
        >
          <RecipeThumbnail recipe={recipe} />
        </button>
        <button
          type="button"
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-start"
          onClick={onPress}
        >
          <RecipeDetails recipe={recipe} />
        </button>
      </>
    ) : (
      <>
        <Link
          to={`/recipes/${recipe.id}`}
          className="shrink-0"
        >
          <RecipeThumbnail recipe={recipe} />
        </Link>
        <Link
          to={`/recipes/${recipe.id}`}
          className="min-w-0 flex-1"
        >
          <RecipeDetails recipe={recipe} />
        </Link>
      </>
    )}
    <button
      type="button"
      className="ms-3 rounded-lg bg-red-50 px-3 py-1 text-sm text-red-600"
      onClick={() => {
        if (window.confirm(`Delete "${recipe.title}"?`)) {
          onDelete(recipe.id);
        }
      }}
    >
      Delete
    </button>
  </div>
);

if (import.meta.env.DEV) {
  RecipeListCard.demo = function RecipeListCardDemo({
    Frame,
  }: {
    Frame: ComponentType<ShowcaseFrameProps>;
  }) {
    const mockRecipe = makeRecipeDetail();

    return (
      <Frame>
        <RecipeListCard
          recipe={mockRecipe}
          onDelete={() => {
            void 0;
          }}
        />
      </Frame>
    );
  };
}

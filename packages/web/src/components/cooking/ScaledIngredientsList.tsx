import {
  formatScaledIngredientLine,
  sortIngredientsByOrder,
} from '@eciperay/client';
import type {RecipeDetail} from '@eciperay/types';

type Props = {recipe: RecipeDetail; scaleFactor: number; servings: number};

export const ScaledIngredientsList = ({
  recipe,
  scaleFactor,
  servings,
}: Props) => (
  <div className="mb-6 max-h-40 overflow-y-auto rounded-xl bg-white/5 p-4">
    <p className="mb-2 text-sm font-medium text-white/80">
      Ingredients
      {scaleFactor === 1
        ? ` (${servings} servings)`
        : ` (scaled to ${servings} servings)`}
    </p>
    {sortIngredientsByOrder(recipe.ingredients).map(ingredient => (
      <p
        key={ingredient.id}
        className="py-1 text-sm text-white/70"
      >
        {formatScaledIngredientLine(ingredient, scaleFactor)}
      </p>
    ))}
  </div>
);

import {
  formatScaledIngredientLine,
  formatServingsLabel,
  sortIngredientsByOrder,
} from '@eciperay/client';
import type {RecipeDetail} from '@eciperay/types';
import {tokens} from '@spudly/ui';

type Props = {recipe: RecipeDetail; scaleFactor: number; servings: number};

export const ScaledIngredientsList = ({
  recipe,
  scaleFactor,
  servings,
}: Props) => (
  <div
    style={{
      marginBottom: tokens.spacing[6],
      overflowY: 'auto',
      borderRadius: 12,
      backgroundColor: 'rgb(255 255 255 / 0.05)',
      padding: tokens.spacing[4],
      maxHeight: 160,
    }}
  >
    <p
      style={{
        margin: 0,
        marginBottom: tokens.spacing[2],
        fontSize: tokens.typography.fontSize.sm,
        fontWeight: tokens.typography.fontWeight.medium,
        color: 'rgb(255 255 255 / 0.8)',
      }}
    >
      Ingredients
      {scaleFactor === 1
        ? ` (${formatServingsLabel(servings)})`
        : ` (scaled to ${formatServingsLabel(servings)})`}
    </p>
    {sortIngredientsByOrder(recipe.ingredients).map(ingredient => (
      <p
        key={ingredient.id}
        style={{
          margin: 0,
          paddingTop: tokens.spacing[1],
          paddingBottom: tokens.spacing[1],
          fontSize: tokens.typography.fontSize.sm,
          color: 'rgb(255 255 255 / 0.7)',
        }}
      >
        {formatScaledIngredientLine(ingredient, scaleFactor)}
      </p>
    ))}
  </div>
);

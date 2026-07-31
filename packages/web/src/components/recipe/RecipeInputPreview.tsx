import {
  formatScaledIngredientLine,
  sortedPreviewIngredients,
  sortedPreviewInstructions,
  makeRecipeDetail,
  recipeDetailToInput,
} from '@eciperay/client';
import type {RecipeVersionInput} from '@eciperay/types';

type Props = {recipe: RecipeVersionInput};

const formatTime = (minutes: number | null | undefined) => {
  if (minutes === null || minutes === undefined) {
    return null;
  }
  return `${minutes} min`;
};

export const RecipeInputPreview = ({recipe}: Props) => {
  const prep = formatTime(recipe.prepTimeMin);
  const cook = formatTime(recipe.cookTimeMin);
  const ingredients = sortedPreviewIngredients(recipe);
  const instructions = sortedPreviewInstructions(recipe);

  return (
    <div className="max-h-96 space-y-4 overflow-y-auto text-sm text-gray-800">
      <div>
        <p className="text-base font-semibold text-gray-900">{recipe.title}</p>
        {recipe.description ? (
          <p className="mt-1 text-gray-600">{recipe.description}</p>
        ) : null}
        <p className="text-muted mt-2 text-xs">
          Serves {recipe.servings}
          {prep ? ` · Prep ${prep}` : ''}
          {cook ? ` · Cook ${cook}` : ''}
        </p>
      </div>
      {ingredients.length > 0 ? (
        <div>
          <p className="mb-1 font-medium text-gray-900">Ingredients</p>
          <ul className="list-inside list-disc space-y-1">
            {ingredients.map(ingredient => (
              <li key={`${ingredient.sortOrder}-${ingredient.name}`}>
                {formatScaledIngredientLine(ingredient, 1)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {instructions.length > 0 ? (
        <div>
          <p className="mb-1 font-medium text-gray-900">Instructions</p>
          <ol className="list-inside list-decimal space-y-2">
            {instructions.map(instruction => (
              <li key={instruction.stepNumber}>{instruction.body}</li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
};

if (import.meta.env.DEV) {
  RecipeInputPreview.demo = function RecipeInputPreviewDemo() {
    const mockPreviewRecipe = recipeDetailToInput(makeRecipeDetail());

    return <RecipeInputPreview recipe={mockPreviewRecipe} />;
  };
}

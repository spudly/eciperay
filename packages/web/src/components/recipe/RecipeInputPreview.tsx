import {
  formatScaledIngredientLine,
  sortedPreviewIngredients,
  sortedPreviewInstructions,
  makeRecipeDetail,
  recipeDetailToInput,
} from '@eciperay/client';
import type {RecipeVersionInput} from '@eciperay/types';
import {eciperayTheme, tokens} from '@spudly/ui';
import type {CSSProperties} from 'react';

type Props = {recipe: RecipeVersionInput};

// Style objects on DS tokens (B7 C12, design-system#130 — the Tailwind
// utilities these replace are gone with the dependency).
const previewContainerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.spacing[4],
  overflowY: 'auto',
  fontSize: tokens.typography.fontSize.sm,
  color: tokens.colors.gray.gray9,
  maxHeight: 384,
};

const sectionHeadingStyle: CSSProperties = {
  margin: 0,
  marginBottom: tokens.spacing[1],
  fontWeight: tokens.typography.fontWeight.medium,
  color: tokens.colors.gray.gray10,
};

const formatTime = (minutes: number | null | undefined) => {
  if (minutes === null || minutes === undefined) {
    return null;
  }
  return `${minutes} min`;
};

// Parity note (design-system#129): the app mirror's showcase demo was
// removed with the in-app component showcase; this web mirror keeps its
// own demo for the web showcase page, so no web change was needed.
export const RecipeInputPreview = ({recipe}: Props) => {
  const prep = formatTime(recipe.prepTimeMin);
  const cook = formatTime(recipe.cookTimeMin);
  const ingredients = sortedPreviewIngredients(recipe);
  const instructions = sortedPreviewInstructions(recipe);

  return (
    <div style={previewContainerStyle}>
      <div>
        <p
          style={{
            margin: 0,
            fontSize: tokens.typography.fontSize.md,
            fontWeight: tokens.typography.fontWeight.semibold,
            color: tokens.colors.gray.gray10,
          }}
        >
          {recipe.title}
        </p>
        {recipe.description ? (
          <p
            style={{
              margin: 0,
              marginTop: tokens.spacing[1],
              color: tokens.colors.gray.gray7,
            }}
          >
            {recipe.description}
          </p>
        ) : null}
        <p
          style={{
            margin: 0,
            marginTop: tokens.spacing[2],
            fontSize: tokens.typography.fontSize.xs,
            color: eciperayTheme.semantic.textMuted,
          }}
        >
          Serves {recipe.servings}
          {prep ? ` · Prep ${prep}` : ''}
          {cook ? ` · Cook ${cook}` : ''}
        </p>
      </div>
      {ingredients.length > 0 ? (
        <div>
          <p style={sectionHeadingStyle}>Ingredients</p>
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyleType: 'disc',
              listStylePosition: 'inside',
              display: 'flex',
              flexDirection: 'column',
              gap: tokens.spacing[1],
            }}
          >
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
          <p style={sectionHeadingStyle}>Instructions</p>
          <ol
            style={{
              margin: 0,
              padding: 0,
              listStyleType: 'decimal',
              listStylePosition: 'inside',
              display: 'flex',
              flexDirection: 'column',
              gap: tokens.spacing[2],
            }}
          >
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

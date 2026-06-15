import {anthropic, HAIKU} from './anthropic.js';

type RecipeDescriptionContext = {
  title: string;
  ingredients: string[];
  instructions: string[];
  prepTimeMin?: number | null;
  cookTimeMin?: number | null;
};

const formatTime = (minutes: number | null | undefined): string | null => {
  if (minutes === null || minutes === undefined) {
    return null;
  }
  return `${minutes} min`;
};

export const generateRecipeDescription = async ({
  title,
  ingredients,
  instructions,
  prepTimeMin,
  cookTimeMin,
}: RecipeDescriptionContext): Promise<string> => {
  const ingredientList =
    ingredients.filter(Boolean).join(', ') || 'various ingredients';
  const instructionList =
    instructions.filter(Boolean).join('\n') || 'No instructions provided';
  const prepTime = formatTime(prepTimeMin);
  const cookTime = formatTime(cookTimeMin);
  const timingParts = [
    prepTime && `Prep: ${prepTime}`,
    cookTime && `Cook: ${cookTime}`,
  ]
    .filter(Boolean)
    .join(', ');
  const timingText =
    timingParts.length > 0 ? timingParts : 'Timing not specified';

  const response = await anthropic.messages.create({
    model: HAIKU,
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: `Write a short, appetizing recipe description in 2-3 sentences (under 400 characters). Focus on flavors, texture, and what makes this dish appealing. Do not include a title or bullet points. Return ONLY the description text with no quotes or explanation.

Title: ${title}
Ingredients: ${ingredientList}
Instructions:
${instructionList}
${timingText}`,
      },
    ],
  });
  const content = response.content[0];
  /* c8 ignore next 3 -- Claude returns non-text blocks only on API errors */
  if (content?.type !== 'text') {
    throw new Error('Unexpected Claude response');
  }
  return content.text.trim();
};

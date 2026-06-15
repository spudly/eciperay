import {anthropic, HAIKU} from './anthropic.js';

export type RecipeImageIngredient = {
  name: string;
  quantity?: number | null;
  unit?: string | null;
};

type RecipeImageContext = {
  title: string;
  description?: string | null;
  ingredients: RecipeImageIngredient[];
  instructions: string[];
};

export const formatRecipeImageIngredient = ({
  name,
  quantity,
  unit,
}: RecipeImageIngredient): string => {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return '';
  }
  const parts: string[] = [];
  if (quantity !== null && quantity !== undefined) {
    parts.push(String(quantity));
  }
  const trimmedUnit = unit?.trim();
  if (trimmedUnit) {
    parts.push(trimmedUnit);
  }
  parts.push(trimmedName);
  return parts.join(' ');
};

export const generateRecipeImagePrompt = async ({
  title,
  description,
  ingredients,
  instructions,
}: RecipeImageContext): Promise<string> => {
  const ingredientList =
    ingredients.map(formatRecipeImageIngredient).filter(Boolean).join(', ') ||
    'various ingredients';
  const instructionList =
    instructions.filter(Boolean).join('\n') || 'No instructions provided';
  const trimmedDescription = description?.trim();
  const descriptionText =
    trimmedDescription && trimmedDescription.length > 0
      ? trimmedDescription
      : 'No description provided';
  const response = await anthropic.messages.create({
    model: HAIKU,
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: `Write a single detailed prompt for an AI image generator to create appetizing, realistic food photography of this dish. Focus on the finished plated dish, natural lighting, and shallow depth of field. Use the ingredients and instructions to infer plating, texture, and garnish. Return ONLY the prompt text with no quotes or explanation.

Title: ${title}
Description: ${descriptionText}
Ingredients: ${ingredientList}
Instructions:
${instructionList}`,
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

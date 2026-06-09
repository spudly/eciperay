import {anthropic, HAIKU} from './anthropic.js';

type RecipeImageContext = {
  title: string;
  description?: string | null;
  ingredients: string[];
};

export const generateRecipeImagePrompt = async ({
  title,
  description,
  ingredients,
}: RecipeImageContext): Promise<string> => {
  const joinedIngredients = ingredients.filter(Boolean).join(', ');
  const ingredientList =
    joinedIngredients.length > 0 ? joinedIngredients : 'various ingredients';
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
        content: `Write a single detailed prompt for an AI image generator to create appetizing, realistic food photography of this dish. Focus on the finished plated dish, natural lighting, and shallow depth of field. Return ONLY the prompt text with no quotes or explanation.

Title: ${title}
Description: ${descriptionText}
Key ingredients: ${ingredientList}`,
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

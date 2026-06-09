import type {RecipeImport} from '@recipoo/types';
import {z} from 'zod';

import {anthropic as defaultAnthropic, HAIKU} from './anthropic.js';
import type {TagOption} from './tagQueries.js';
import {parseAiJson} from './validate.js';

type AnthropicClient = typeof defaultAnthropic;

const TagNamesSchema = z.array(z.string());

const summarizeRecipeForTags = (recipe: RecipeImport) => {
  const ingredientNames = recipe.ingredients.map(ing => ing.name).join(', ');
  return `Title: ${recipe.title}
Description: ${recipe.description ?? ''}
Ingredients: ${ingredientNames}`;
};

const mapSelectedNamesToIds = (
  selectedNames: string[],
  availableTags: TagOption[],
) => {
  const nameToId = new Map(
    availableTags.map(tag => [tag.name.toLowerCase(), tag.id]),
  );
  const seen = new Set<string>();
  const tagIds: string[] = [];
  for (const name of selectedNames) {
    const id = nameToId.get(name.toLowerCase());
    if (id && !seen.has(id)) {
      seen.add(id);
      tagIds.push(id);
    }
  }
  return tagIds;
};

export const selectTagIdsForRecipe = async (
  recipe: RecipeImport,
  availableTags: TagOption[],
  client: AnthropicClient = defaultAnthropic,
): Promise<string[]> => {
  if (availableTags.length === 0) {
    return [];
  }
  const tagNames = availableTags.map(tag => tag.name);
  const message = await client.messages.create({
    model: HAIKU,
    max_tokens: 200,
    system: `Select tags that apply to this recipe. Return ONLY a JSON array of tag names from the provided list. Use exact names only. Pick 1-5 relevant tags.`,
    messages: [
      {
        role: 'user',
        content: `Available tags: ${JSON.stringify(tagNames)}\n\nRecipe:\n${summarizeRecipeForTags(recipe)}`,
      },
    ],
  });
  const first = message.content[0];
  if (first?.type !== 'text') {
    return [];
  }
  try {
    const selectedNames = parseAiJson(TagNamesSchema, first.text);
    return mapSelectedNamesToIds(selectedNames, availableTags);
  } catch {
    return [];
  }
};

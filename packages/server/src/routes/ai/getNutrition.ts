import type {Response} from 'express';
import type {RecipeDetail} from '@eciperay/types';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {anthropic, HAIKU} from '../../lib/anthropic.js';
import {getParam} from '../../lib/getParam.js';
import {fetchRecipeDetail} from '../../lib/recipeQueries.js';
import {AiNutritionResponseSchema, parseAiJson} from '../../lib/schemas.js';

type QueryFn = typeof defaultQuery;

const PROMPT_TEMPLATE = (ingredients: string, servings: number) =>
  `Estimate nutrition per serving for a recipe with ${servings} servings.
Ingredients: ${ingredients}
Return ONLY JSON: {"calories":n,"proteinG":n,"carbsG":n,"fatG":n,"fiberG":n,"sugarG":n,"sodiumMg":n,"disclaimer":"..."}`;

const callClaude = async (ingredientList: string, servings: number) => {
  const response = await anthropic.messages.create({
    model: HAIKU,
    max_tokens: 512,
    messages: [
      {role: 'user', content: PROMPT_TEMPLATE(ingredientList, servings)},
    ],
  });
  const content = response.content[0];
  /* c8 ignore next 3 -- Claude returns non-text blocks only on API errors */
  if (content?.type !== 'text') {
    throw new Error('Unexpected Claude response');
  }
  return parseAiJson(AiNutritionResponseSchema, content.text);
};

const buildIngredientList = (recipe: RecipeDetail) =>
  recipe.ingredients
    .map(i => `${i.quantity ?? ''} ${i.unit ?? ''} ${i.name}`.trim())
    .join(', ');

export const getNutrition = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const recipe = await fetchRecipeDetail(
    getParam(req, 'id'),
    req.userId,
    queryFn,
  );
  if (!recipe) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }
  const result = await callClaude(buildIngredientList(recipe), recipe.servings);
  res.json({...result, servings: recipe.servings});
};

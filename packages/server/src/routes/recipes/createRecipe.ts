import type {Response} from 'express';
import type {RecipeInput} from '@recipoo/types';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';

import {
  GET_RECIPE_DETAIL_SQL,
  insertIngredient,
  insertInstruction,
  insertRecipe,
  linkTag,
} from './queries.js';

type QueryFn = typeof defaultQuery;

const toIngredientData = (ing: RecipeInput['ingredients'][number]) => ({
  name: ing.name,
  quantity: ing.quantity ?? null,
  unit: ing.unit ?? null,
  notes: ing.notes ?? null,
  isOptional: ing.isOptional,
});

const insertIngredients = (
  recipeId: string,
  ingredients: RecipeInput['ingredients'],
  queryFn: QueryFn,
) =>
  Promise.all(
    ingredients.map((ing, i) =>
      insertIngredient(recipeId, i, toIngredientData(ing), queryFn),
    ),
  );

const insertInstructions = (
  recipeId: string,
  instructions: RecipeInput['instructions'],
  queryFn: QueryFn,
) =>
  Promise.all(
    instructions.map(ins =>
      insertInstruction(recipeId, ins.stepNumber, ins.body, queryFn),
    ),
  );

const linkTags = (recipeId: string, tagIds: string[], queryFn: QueryFn) =>
  Promise.all(tagIds.map(tagId => linkTag(recipeId, tagId, queryFn)));

const buildRecipeInput = (body: RecipeInput, userId: string) => ({
  userId,
  title: body.title,
  description: body.description ?? null,
  servings: body.servings,
  prepTimeMin: body.prepTimeMin ?? null,
  cookTimeMin: body.cookTimeMin ?? null,
  imageUrl: body.imageUrl ?? null,
  starRating: body.starRating ?? null,
  sourceUrl: body.sourceUrl ?? null,
});

const populateRecipe = (
  recipeId: string,
  body: RecipeInput,
  queryFn: QueryFn,
) =>
  Promise.all([
    insertIngredients(recipeId, body.ingredients, queryFn),
    insertInstructions(recipeId, body.instructions, queryFn),
    linkTags(recipeId, body.tagIds, queryFn),
  ]);

export const createRecipe = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = req.body as RecipeInput;
  const recipe = await insertRecipe(
    buildRecipeInput(body, req.userId),
    queryFn,
  );
  const recipeId: string = (recipe.rows[0] as {id: string}).id;
  await populateRecipe(recipeId, body, queryFn);
  const detail = await queryFn(GET_RECIPE_DETAIL_SQL, [recipeId, req.userId]);
  res.status(201).json(detail.rows[0]);
};

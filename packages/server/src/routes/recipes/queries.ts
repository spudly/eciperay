import type {RecipeInput} from '@recipoo/types';

import {query as defaultQuery} from '../../db/query.js';

export {GET_RECIPE_DETAIL_SQL, LIST_RECIPES_SQL} from './sqlConstants.js';

type QueryFn = typeof defaultQuery;

type InsertRecipeOptions = {
  userId: string;
  title: string;
  description: string | null;
  servings: number;
  prepTimeMin: number | null;
  cookTimeMin: number | null;
  imageUrl: string | null;
  starRating: number | null;
  sourceUrl: string | null;
};

const INSERT_RECIPE_SQL = `insert into recipes
     (user_id, title, description, servings, prep_time_min,
      cook_time_min, image_url, star_rating, source_url)
   values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
   returning *`;

const UPDATE_RECIPE_SQL = `
  update recipes
  set title         = $3,
      description   = $4,
      servings      = $5,
      prep_time_min = $6,
      cook_time_min = $7,
      image_url     = $8,
      star_rating   = $9,
      source_url    = $10
  where id = $1 and user_id = $2
  returning id
`;

const recipeParams = ({
  userId,
  title,
  description,
  servings,
  prepTimeMin,
  cookTimeMin,
  imageUrl,
  starRating,
  sourceUrl,
}: InsertRecipeOptions) => [
  userId,
  title,
  description,
  servings,
  prepTimeMin,
  cookTimeMin,
  imageUrl,
  starRating,
  sourceUrl,
];

export const buildRecipeOptions = (
  input: RecipeInput,
  userId: string,
): InsertRecipeOptions => ({
  userId,
  title: input.title,
  description: input.description ?? null,
  servings: input.servings,
  prepTimeMin: input.prepTimeMin ?? null,
  cookTimeMin: input.cookTimeMin ?? null,
  imageUrl: input.imageUrl ?? null,
  starRating: input.starRating ?? null,
  sourceUrl: input.sourceUrl ?? null,
});

export const insertRecipe = (opts: InsertRecipeOptions, queryFn: QueryFn) =>
  queryFn(INSERT_RECIPE_SQL, recipeParams(opts));

export const updateRecipe = (
  recipeId: string,
  opts: InsertRecipeOptions,
  queryFn: QueryFn,
) =>
  queryFn(UPDATE_RECIPE_SQL, [
    recipeId,
    opts.userId,
    opts.title,
    opts.description,
    opts.servings,
    opts.prepTimeMin,
    opts.cookTimeMin,
    opts.imageUrl,
    opts.starRating,
    opts.sourceUrl,
  ]);

type IngredientData = {
  name: string;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
  isOptional: boolean;
};

const INGREDIENT_SQL = `insert into ingredients
     (recipe_id, sort_order, name, quantity, unit, notes, is_optional)
   values ($1,$2,$3,$4,$5,$6,$7)`;

const ingredientParams = (
  recipeId: string,
  sortOrder: number,
  data: IngredientData,
) => [
  recipeId,
  sortOrder,
  data.name,
  data.quantity,
  data.unit,
  data.notes,
  data.isOptional,
];

const toIngredientData = (
  ing: RecipeInput['ingredients'][number],
): IngredientData => ({
  name: ing.name,
  quantity: ing.quantity ?? null,
  unit: ing.unit ?? null,
  notes: ing.notes ?? null,
  isOptional: ing.isOptional,
});

export const insertIngredient = (
  recipeId: string,
  sortOrder: number,
  data: IngredientData,
  queryFn: QueryFn,
) => queryFn(INGREDIENT_SQL, ingredientParams(recipeId, sortOrder, data));

export const insertIngredients = (
  recipeId: string,
  ingredients: RecipeInput['ingredients'],
  queryFn: QueryFn,
) =>
  Promise.all(
    ingredients.map(ing =>
      insertIngredient(recipeId, ing.sortOrder, toIngredientData(ing), queryFn),
    ),
  );

export const insertInstruction = (
  recipeId: string,
  stepNumber: number,
  body: string,
  queryFn: QueryFn,
) =>
  queryFn(
    'insert into instructions (recipe_id, step_number, body) values ($1,$2,$3)',
    [recipeId, stepNumber, body],
  );

export const insertInstructions = (
  recipeId: string,
  instructions: RecipeInput['instructions'],
  queryFn: QueryFn,
) =>
  Promise.all(
    instructions.map(ins =>
      insertInstruction(recipeId, ins.stepNumber, ins.body, queryFn),
    ),
  );

export const linkTag = (recipeId: string, tagId: string, queryFn: QueryFn) =>
  queryFn(
    'insert into recipe_tags (recipe_id, tag_id) values ($1,$2) on conflict do nothing',
    [recipeId, tagId],
  );

export const linkTags = (
  recipeId: string,
  tagIds: string[],
  queryFn: QueryFn,
) => Promise.all(tagIds.map(tagId => linkTag(recipeId, tagId, queryFn)));

export const deleteIngredientsByRecipeId = (
  recipeId: string,
  queryFn: QueryFn,
) => queryFn('delete from ingredients where recipe_id = $1', [recipeId]);

export const deleteInstructionsByRecipeId = (
  recipeId: string,
  queryFn: QueryFn,
) => queryFn('delete from instructions where recipe_id = $1', [recipeId]);

export const deleteRecipeTagsByRecipeId = (
  recipeId: string,
  queryFn: QueryFn,
) => queryFn('delete from recipe_tags where recipe_id = $1', [recipeId]);

export const deleteRecipeById = (
  recipeId: string,
  userId: string,
  queryFn: QueryFn,
) =>
  queryFn('delete from recipes where id=$1 and user_id=$2', [recipeId, userId]);

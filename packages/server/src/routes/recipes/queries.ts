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

export const insertRecipe = (opts: InsertRecipeOptions, queryFn: QueryFn) =>
  queryFn(INSERT_RECIPE_SQL, recipeParams(opts));

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

export const insertIngredient = (
  recipeId: string,
  sortOrder: number,
  data: IngredientData,
  queryFn: QueryFn,
) => queryFn(INGREDIENT_SQL, ingredientParams(recipeId, sortOrder, data));

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

export const linkTag = (recipeId: string, tagId: string, queryFn: QueryFn) =>
  queryFn(
    'insert into recipe_tags (recipe_id, tag_id) values ($1,$2) on conflict do nothing',
    [recipeId, tagId],
  );

export const deleteRecipeById = (
  recipeId: string,
  userId: string,
  queryFn: QueryFn,
) =>
  queryFn('delete from recipes where id=$1 and user_id=$2', [recipeId, userId]);

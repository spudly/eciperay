import type {Ingredient, Instruction, RecipeDetail, Tag} from '@recipoo/types';

type RecipeDetailRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  servings: number;
  prep_time_min: number | null;
  cook_time_min: number | null;
  image_url: string | null;
  star_rating: 1 | 2 | 3 | 4 | 5 | null;
  source_url: string | null;
  created_at: string;
  updated_at: string;
  ingredients: Ingredient[];
  instructions: Instruction[];
  tags: Tag[];
};

export type RecipeListRow = {
  id: string;
  title: string;
  description: string | null;
  servings: number;
  prep_time_min: number | null;
  cook_time_min: number | null;
  image_url: string | null;
  star_rating: 1 | 2 | 3 | 4 | 5 | null;
  source_url: string | null;
  created_at: string;
  updated_at: string;
  tags: Tag[];
};

export const mapRowToRecipeListItem = (row: RecipeListRow): RecipeDetail => ({
  id: row.id,
  userId: '',
  title: row.title,
  description: row.description,
  servings: row.servings,
  prepTimeMin: row.prep_time_min,
  cookTimeMin: row.cook_time_min,
  imageUrl: row.image_url,
  starRating: row.star_rating,
  sourceUrl: row.source_url,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  ingredients: [],
  instructions: [],
  tags: row.tags,
});

export const mapRowToRecipeDetail = (row: RecipeDetailRow): RecipeDetail => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  description: row.description,
  servings: row.servings,
  prepTimeMin: row.prep_time_min,
  cookTimeMin: row.cook_time_min,
  imageUrl: row.image_url,
  starRating: row.star_rating,
  sourceUrl: row.source_url,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  ingredients: row.ingredients,
  instructions: row.instructions,
  tags: row.tags,
});

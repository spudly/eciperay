import {query as defaultQuery} from '../db/query.js';

import {canReadRecipe, toRecipeAccessRecord} from './recipeAccess.js';
import {userHasShareGrant} from './shareGrant.js';

type QueryFn = typeof defaultQuery;

const RECIPE_ACCESS_SQL = `
  select r.id, r.user_id, r.visibility, r.share_token_hash,
         rv.id as version_id, rv.servings, rv.title, rv.image_url,
         rv.calories, rv.protein_g, rv.carbs_g, rv.fat_g,
         rv.fiber_g, rv.sugar_g, rv.sodium_mg, rv.prepared_weight_g,
         rv.satiety_score, rv.nutrition_status, rv.step_timing_status
  from recipes r
  join recipe_versions rv on rv.id = r.active_version_id
  where r.id = $1
`;

export type AccessibleRecipeRow = {
  id: string;
  user_id: string;
  visibility: 'private' | 'unlisted' | 'public';
  share_token_hash: string | null;
  version_id: string;
  servings: number;
  title: string;
  image_url: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
  prepared_weight_g: number | null;
  satiety_score: number | null;
  nutrition_status: string | null;
  step_timing_status: string | null;
};

export const loadAccessibleRecipe = async (
  recipeId: string,
  userId: string,
  queryFn: QueryFn = defaultQuery,
): Promise<AccessibleRecipeRow | null> => {
  const result = await queryFn(RECIPE_ACCESS_SQL, [recipeId]);
  const row = result.rows[0] as AccessibleRecipeRow | undefined;
  if (!row) {
    return null;
  }
  const hasShareGrant = await userHasShareGrant(recipeId, userId, queryFn);
  if (!canReadRecipe(toRecipeAccessRecord(row), {userId, hasShareGrant})) {
    return null;
  }
  return row;
};

export const loadRecipeRowIgnoringAccess = async (
  recipeId: string,
  queryFn: QueryFn = defaultQuery,
): Promise<AccessibleRecipeRow | null> => {
  const result = await queryFn(RECIPE_ACCESS_SQL, [recipeId]);
  return (result.rows[0] as AccessibleRecipeRow | undefined) ?? null;
};

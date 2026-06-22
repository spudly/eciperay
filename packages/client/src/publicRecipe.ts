import type {PublicRecipeDetail, RecipeDetail} from '@eciperay/types';

export const publicRecipeToRecipeDetail = (
  recipe: PublicRecipeDetail,
): RecipeDetail => ({...recipe, userId: ''});

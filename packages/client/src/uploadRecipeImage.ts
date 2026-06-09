import type {SupabaseClient} from '@supabase/supabase-js';

import {validateRecipeImageFile} from './validateRecipeImageFile.js';

export const RECIPE_IMAGES_BUCKET = 'recipe-images';

export const recipeImageStoragePath = (userId: string, recipeId: string) =>
  `${userId}/${recipeId}`;

export const uploadRecipeImage = async (
  supabase: SupabaseClient,
  file: File,
  userId: string,
  recipeId: string,
) => {
  validateRecipeImageFile(file);
  const path = recipeImageStoragePath(userId, recipeId);
  const {error} = await supabase.storage
    .from(RECIPE_IMAGES_BUCKET)
    .upload(path, file, {contentType: file.type, upsert: true});
  if (error) {
    throw error;
  }
  const {data} = supabase.storage.from(RECIPE_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

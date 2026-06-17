import type {SupabaseClient} from '@supabase/supabase-js';

import {
  validateRecipeImageContent,
  validateRecipeImageFile,
} from './validateRecipeImageFile.js';

export const RECIPE_IMAGES_BUCKET = 'recipe-images';

export type RecipeImageUploadTarget = {userId: string; recipeId: string};

export const recipeImageStoragePath = (userId: string, recipeId: string) =>
  `${userId}/${recipeId}`;

export const decodeBase64ToBytes = (base64: string): Uint8Array => {
  if (typeof globalThis.atob !== 'function') {
    throw new TypeError('Base64 decoding is not available');
  }
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    // atob returns a latin1 string; each code unit is one byte.
    // eslint-disable-next-line unicorn/prefer-code-point -- byte index maps 1:1 for latin1
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

export const uploadRecipeImageBytes = async (
  supabase: SupabaseClient,
  bytes: Uint8Array,
  contentType: string,
  {userId, recipeId}: RecipeImageUploadTarget,
) => {
  validateRecipeImageContent(contentType, bytes.byteLength);
  const path = recipeImageStoragePath(userId, recipeId);
  const {error} = await supabase.storage
    .from(RECIPE_IMAGES_BUCKET)
    .upload(path, bytes, {contentType, upsert: true});
  if (error) {
    throw error;
  }
  const {data} = supabase.storage.from(RECIPE_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

export const uploadRecipeImageFromBase64 = async (
  supabase: SupabaseClient,
  base64: string,
  contentType: string,
  target: RecipeImageUploadTarget,
) =>
  uploadRecipeImageBytes(
    supabase,
    decodeBase64ToBytes(base64),
    contentType,
    target,
  );

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

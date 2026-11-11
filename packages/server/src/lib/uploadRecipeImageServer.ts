import {supabase} from '../supabase.js';

import {downloadRemoteImage} from './remoteImageDownload.js';
import {withTimeoutOrNull} from './withTimeout.js';

export {fetchImageAsBase64} from './remoteImageDownload.js';

const RECIPE_IMAGES_BUCKET = 'recipe-images';

const recipeImageStoragePath = (supabaseUid: string, recipeId: string) =>
  `${supabaseUid}/${recipeId}`;

const parseImageDataUrl = (
  dataUrl: string,
): {buffer: Buffer; contentType: string} | null => {
  const match = /^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/i.exec(
    dataUrl,
  );
  const contentType = match?.[1];
  const base64Data = match?.[2];
  if (!contentType || !base64Data) {
    return null;
  }
  return {contentType, buffer: Buffer.from(base64Data, 'base64')};
};

export const uploadRecipeImageBuffer = async (
  supabaseUid: string,
  recipeId: string,
  buffer: Buffer,
  contentType: string,
) => {
  const path = recipeImageStoragePath(supabaseUid, recipeId);
  const {error} = await supabase.storage
    .from(RECIPE_IMAGES_BUCKET)
    .upload(path, buffer, {contentType, upsert: true});
  if (error) {
    throw error;
  }
  const {data} = supabase.storage.from(RECIPE_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

type UploadBufferFn = (
  supabaseUid: string,
  recipeId: string,
  buffer: Buffer,
  contentType: string,
) => Promise<string>;

type FetchFn = typeof fetch;

type ResolveImportedImageDeps = {
  uploadFn?: UploadBufferFn;
  fetchFn?: FetchFn;
  timeoutMs?: number;
};

/**
 * Default bound for resolving an imported image (download + storage upload).
 * The download leg already aborts at 10s (remoteImageDownload), but the
 * storage upload had no bound at all: a stuck upload held the import
 * response indefinitely (issue #492). On timeout the import degrades to
 * "no image" — a null result is already a normal outcome of this function.
 */
export const IMPORTED_IMAGE_TIMEOUT_MS = 15_000;

const resolveImportedImageUrlWithinBound = async (
  candidate: string,
  supabaseUid: string,
  recipeId: string,
  uploadFn: UploadBufferFn,
  fetchFn: FetchFn,
): Promise<string | null> => {
  if (candidate.startsWith('http://') || candidate.startsWith('https://')) {
    const downloaded = await downloadRemoteImage(candidate, fetchFn);
    if (!downloaded) {
      return null;
    }
    return uploadFn(
      supabaseUid,
      recipeId,
      downloaded.buffer,
      downloaded.contentType,
    );
  }
  const parsed = parseImageDataUrl(candidate);
  if (!parsed) {
    return null;
  }
  return uploadFn(supabaseUid, recipeId, parsed.buffer, parsed.contentType);
};

export const resolveImportedImageUrl = async (
  candidate: string,
  supabaseUid: string,
  recipeId: string,
  {
    uploadFn = uploadRecipeImageBuffer,
    fetchFn = fetch,
    timeoutMs = IMPORTED_IMAGE_TIMEOUT_MS,
  }: ResolveImportedImageDeps = {},
): Promise<string | null> =>
  withTimeoutOrNull(
    resolveImportedImageUrlWithinBound(
      candidate,
      supabaseUid,
      recipeId,
      uploadFn,
      fetchFn,
    ),
    timeoutMs,
    'imported image resolution',
  );

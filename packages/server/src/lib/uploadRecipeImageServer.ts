import {supabase} from '../supabase.js';

const RECIPE_IMAGES_BUCKET = 'recipe-images';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

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

const downloadRemoteImage = async (
  url: string,
  fetchFn: FetchFn,
): Promise<{buffer: Buffer; contentType: string} | null> => {
  try {
    const response = await fetchFn(url, {
      headers: {'User-Agent': 'Recipoo/1.0'},
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      return null;
    }
    const contentType = response.headers
      .get('content-type')
      ?.split(';')[0]
      ?.trim();
    if (!contentType?.startsWith('image/')) {
      return null;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
      return null;
    }
    return {buffer, contentType};
  } catch {
    return null;
  }
};

type ResolveImportedImageDeps = {uploadFn?: UploadBufferFn; fetchFn?: FetchFn};

export const fetchImageAsBase64 = async (
  url: string,
  fetchFn: FetchFn = fetch,
) => {
  const downloaded = await downloadRemoteImage(url, fetchFn);
  if (!downloaded) {
    return null;
  }
  return {
    base64: downloaded.buffer.toString('base64'),
    contentType: downloaded.contentType,
  };
};

export const resolveImportedImageUrl = async (
  candidate: string,
  supabaseUid: string,
  recipeId: string,
  {
    uploadFn = uploadRecipeImageBuffer,
    fetchFn = fetch,
  }: ResolveImportedImageDeps = {},
) => {
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

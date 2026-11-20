import sharp from 'sharp';

import {supabase} from '../supabase.js';

import {logger} from './logger.js';

export const RECIPE_IMAGES_BUCKET = 'recipe-images';
export const MIN_IMAGE_WIDTH = 16;
export const MAX_IMAGE_WIDTH = 1600;
export const IMAGE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

export type StoredImage = {buffer: Buffer; contentType: string | null};

export type ImageStorage = {
  download: (key: string) => Promise<StoredImage | null>;
  upload: (key: string, buffer: Buffer, contentType: string) => Promise<void>;
  list: (folder: string, search: string) => Promise<string[]>;
  remove: (keys: string[]) => Promise<void>;
};

export const variantKeyFor = (key: string, width: number): string =>
  `${key}__w${width}`;

export const parseImageWidth = (raw: unknown): number | null => {
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) {
    return null;
  }
  const width = Number(raw);
  if (!Number.isInteger(width) || width < MIN_IMAGE_WIDTH || width > MAX_IMAGE_WIDTH) {
    return null;
  }
  return width;
};

/** Validate a storage key: `<uid>/<recipeId>` style, no traversal. */
export const isValidImageKey = (key: unknown): key is string =>
  typeof key === 'string' &&
  key.length > 0 &&
  key.length <= 512 &&
  !key.startsWith('/') &&
  !key.includes('..') &&
  !key.includes('\\') &&
  !key.includes('\0');

const FORMAT_CONTENT_TYPES: Record<string, string> = {
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
  svg: 'image/svg+xml',
};

export const contentTypeForFormat = (format: string | undefined): string =>
  (format && FORMAT_CONTENT_TYPES[format]) || 'image/jpeg';

export type ResizeFn = (
  buffer: Buffer,
  width: number,
) => Promise<{buffer: Buffer; contentType: string}>;

export const sharpResize: ResizeFn = async (buffer, width) => {
  const {data, info} = await sharp(buffer)
    .autoOrient()
    .resize({width, withoutEnlargement: true})
    .toBuffer({resolveWithObject: true});
  return {buffer: data, contentType: contentTypeForFormat(info.format)};
};

/* c8 ignore start -- live Supabase adapter; route/lib tests inject a fake */
export const supabaseImageStorage: ImageStorage = {
  download: async key => {
    const {data, error} = await supabase.storage
      .from(RECIPE_IMAGES_BUCKET)
      .download(key);
    if (error || !data) {
      return null;
    }
    return {
      buffer: Buffer.from(await data.arrayBuffer()),
      contentType: data.type || null,
    };
  },
  upload: async (key, buffer, contentType) => {
    const {error} = await supabase.storage
      .from(RECIPE_IMAGES_BUCKET)
      .upload(key, buffer, {contentType, upsert: true});
    if (error) {
      throw error;
    }
  },
  list: async (folder, search) => {
    // Supabase list() defaults to (and caps a page at) 100 results: page
    // through ALL results before returning, so callers deleting variants
    // never miss entries beyond the first page. Nothing is deleted between
    // page reads (deletion happens in the caller, after this returns).
    const pageSize = 100;
    const entries: {name: string}[] = [];
    let offset = 0;
    for (;;) {
      const {data, error} = await supabase.storage
        .from(RECIPE_IMAGES_BUCKET)
        .list(folder, {search, limit: pageSize, offset});
      if (error) {
        // Throw so the caller's catch logs it; returning [] would silently
        // look like "no variants to delete".
        throw error;
      }
      if (!data || data.length === 0) {
        break;
      }
      entries.push(...data);
      if (data.length < pageSize) {
        break;
      }
      offset += pageSize;
    }
    return entries.map(entry => (folder ? `${folder}/${entry.name}` : entry.name));
  },
  remove: async keys => {
    if (keys.length === 0) {
      return;
    }
    const {error} = await supabase.storage
      .from(RECIPE_IMAGES_BUCKET)
      .remove(keys);
    if (error) {
      throw error;
    }
  },
};
/* c8 ignore stop */

/** Delete every cached `__w*` variant of `key`. Errors are logged, not fatal. */
export const deleteResizedVariants = async (
  key: string,
  storage: ImageStorage = supabaseImageStorage,
): Promise<string[]> => {
  try {
    const slash = key.lastIndexOf('/');
    const folder = slash === -1 ? '' : key.slice(0, slash);
    const base = slash === -1 ? key : key.slice(slash + 1);
    const listed = await storage.list(folder, `${base}__w`);
    const variants = listed.filter(name => name.startsWith(`${key}__w`));
    if (variants.length > 0) {
      await storage.remove(variants);
    }
    return variants;
  } catch (error) {
    logger.warn({err: error, key}, 'Failed to delete resized image variants');
    return [];
  }
};

/** Extract the bucket key from a recipe-images public URL, or null. */
export const imageKeyFromPublicUrl = (imageUrl: string | null | undefined): string | null => {
  if (!imageUrl) {
    return null;
  }
  const marker = '/storage/v1/object/public/recipe-images/';
  const index = imageUrl.indexOf(marker);
  if (index === -1) {
    return null;
  }
  const key = decodeURIComponent(
    imageUrl.slice(index + marker.length).split(/[?#]/)[0] ?? '',
  );
  return isValidImageKey(key) ? key : null;
};

export const deleteResizedVariantsForPublicUrl = async (
  imageUrl: string | null | undefined,
  storage: ImageStorage = supabaseImageStorage,
): Promise<string[]> => {
  let key: string | null;
  try {
    key = imageKeyFromPublicUrl(imageUrl);
  } catch (error) {
    // Malformed percent sequences make decodeURIComponent throw; variant
    // invalidation is best-effort and must never break the caller.
    logger.warn(
      {err: error, imageUrl},
      'Failed to extract image key for resized variant invalidation',
    );
    return [];
  }
  return key ? deleteResizedVariants(key, storage) : [];
};

import {validateRecipeImageContent} from '@eciperay/client';
import ReactNativeBlobUtil from 'react-native-blob-util';
import type {Asset} from 'react-native-image-picker';

export type PendingRecipeImage = {base64: string; contentType: string};

const extensionForContentType = (contentType: string): string => {
  switch (contentType) {
    case 'image/jpeg': {
      return 'jpg';
    }
    case 'image/png': {
      return 'png';
    }
    case 'image/gif': {
      return 'gif';
    }
    case 'image/webp': {
      return 'webp';
    }
    default: {
      return 'img';
    }
  }
};

export const base64ImagePreviewUri = (base64: string, contentType: string) =>
  `data:${contentType};base64,${base64}`;

const previewFilePath = (uri: string): string =>
  uri.startsWith('file://') ? uri.slice('file://'.length) : uri;

export const writeBase64ImagePreview = async (
  base64: string,
  contentType: string,
): Promise<string> => {
  const filePath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/recipe-preview-${Date.now()}.${extensionForContentType(contentType)}`;
  await ReactNativeBlobUtil.fs.writeFile(filePath, base64, 'base64');
  return `file://${filePath}`;
};

export const deleteImagePreviewFile = async (uri: string): Promise<void> => {
  if (!uri.includes('recipe-preview-')) {
    return;
  }
  const filePath = previewFilePath(uri);
  try {
    const exists = await ReactNativeBlobUtil.fs.exists(filePath);
    if (exists) {
      await ReactNativeBlobUtil.fs.unlink(filePath);
    }
  } catch {
    // Preview cleanup is best-effort.
  }
};

export const recipeImageFromAsset = (asset: Asset): PendingRecipeImage => {
  const base64 = asset.base64;
  const contentType = asset.type ?? 'image/jpeg';
  if (!base64) {
    throw new Error('Failed to read image');
  }
  const byteLength = asset.fileSize ?? Math.floor((base64.length * 3) / 4);
  validateRecipeImageContent(contentType, byteLength);
  return {base64, contentType};
};

export const stripImageCacheKey = (url: string): string => {
  const [withoutQuery] = url.split('?');
  return withoutQuery;
};

export const withImageCacheKey = (url: string, cacheKey: number): string => {
  const base = stripImageCacheKey(url);
  return `${base}?v=${cacheKey}`;
};

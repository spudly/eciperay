const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

export const validateRecipeImageContent = (
  contentType: string,
  byteLength: number,
) => {
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw new Error('Please choose a JPEG, PNG, GIF, or WebP image');
  }
  if (byteLength > MAX_IMAGE_BYTES) {
    throw new Error('Image must be 5 MB or smaller');
  }
};

export const validateRecipeImageFile = (file: File) => {
  validateRecipeImageContent(file.type, file.size);
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

export const validateRecipeImageFile = (file: File) => {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Please choose a JPEG, PNG, GIF, or WebP image');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Image must be 5 MB or smaller');
  }
};

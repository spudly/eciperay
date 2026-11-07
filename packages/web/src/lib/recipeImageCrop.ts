/**
 * Pure crop geometry for the recipe image crop step (#406), plus the canvas
 * step that turns a crop rectangle in natural-image pixels into a new File. The
 * geometry helpers are unit-testable without a DOM image; the component keeps
 * its crop box in natural pixels and converts to/from display percentages only
 * when rendering.
 */

export type CropRect = {x: number; y: number; width: number; height: number};

/** Recipe photos render in a 4:3 frame, so the default crop box uses it. */
export const RECIPE_CROP_ASPECT = 4 / 3;

export const MIN_CROP_SIZE = 24;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), Math.max(min, max));

/** Largest centered rectangle of `aspect` (width / height) inside the image. */
export const defaultCropRect = (
  imageWidth: number,
  imageHeight: number,
  aspect: number = RECIPE_CROP_ASPECT,
): CropRect => {
  const safeWidth = Math.max(1, Math.floor(imageWidth));
  const safeHeight = Math.max(1, Math.floor(imageHeight));
  let width = safeWidth;
  let height = Math.round(width / aspect);
  if (height > safeHeight) {
    height = safeHeight;
    width = Math.round(height * aspect);
  }
  return {
    x: Math.floor((safeWidth - width) / 2),
    y: Math.floor((safeHeight - height) / 2),
    width,
    height,
  };
};

/** Clamp a crop rectangle so it stays fully inside the image. */
export const clampCropRect = (
  rect: CropRect,
  imageWidth: number,
  imageHeight: number,
): CropRect => {
  const minWidth = Math.min(MIN_CROP_SIZE, imageWidth);
  const minHeight = Math.min(MIN_CROP_SIZE, imageHeight);
  const width = clamp(Math.round(rect.width), minWidth, imageWidth);
  const height = clamp(Math.round(rect.height), minHeight, imageHeight);
  return {
    x: clamp(Math.round(rect.x), 0, imageWidth - width),
    y: clamp(Math.round(rect.y), 0, imageHeight - height),
    width,
    height,
  };
};

export const moveCropRect = (
  rect: CropRect,
  deltaX: number,
  deltaY: number,
  imageWidth: number,
  imageHeight: number,
): CropRect =>
  clampCropRect(
    {...rect, x: rect.x + deltaX, y: rect.y + deltaY},
    imageWidth,
    imageHeight,
  );

/** Resize from the bottom-right corner, keeping the top-left anchored. */
export const resizeCropRect = (
  rect: CropRect,
  deltaWidth: number,
  deltaHeight: number,
  imageWidth: number,
  imageHeight: number,
): CropRect =>
  clampCropRect(
    {
      ...rect,
      width: rect.width + deltaWidth,
      height: rect.height + deltaHeight,
    },
    imageWidth,
    imageHeight,
  );

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => {
      resolve(image);
    });
    image.addEventListener('error', () => {
      reject(new Error('Failed to load image for cropping'));
    });
    image.src = src;
  });

/**
 * Draw the crop rectangle of `file`'s image onto a canvas and return the
 * cropped image as a new File with the same name and type.
 */
export const cropImageFile = async (
  file: File,
  rect: CropRect,
): Promise<File> => {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(rect.width));
    canvas.height = Math.max(1, Math.round(rect.height));
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to crop image');
    }
    context.drawImage(
      image,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    const blob = await new Promise<Blob | null>(resolve => {
      canvas.toBlob(resolve, file.type || 'image/png');
    });
    if (!blob) {
      throw new Error('Failed to crop image');
    }
    return new File([blob], file.name, {type: blob.type || file.type});
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

/**
 * Web execution step for the recipe image crop (#406): the canvas step that
 * turns a crop rectangle in natural-image pixels into a new File. The pure
 * crop geometry lives in @eciperay/client (#677) and is re-exported here so
 * existing web imports keep working.
 */
import type {CropRect} from '@eciperay/client';

export {
  clampCropRect,
  defaultCropRect,
  MIN_CROP_SIZE,
  moveCropRect,
  RECIPE_CROP_ASPECT,
  resizeCropRect,
  type CropRect,
} from '@eciperay/client';

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

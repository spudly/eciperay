import {Router} from 'express';
import type {Request, Response} from 'express';

import {
  IMAGE_CACHE_CONTROL,
  isValidImageKey,
  parseImageWidth,
  sharpResize,
  supabaseImageStorage,
  variantKeyFor,
  type ImageStorage,
  type ResizeFn,
} from '../../lib/imageResizer.js';
import {logger} from '../../lib/logger.js';

export type ImageResizerDeps = {
  storage?: ImageStorage;
  resize?: ResizeFn;
};

const sendImage = (
  res: Response,
  buffer: Buffer,
  contentType: string | null,
) => {
  res.setHeader('Cache-Control', IMAGE_CACHE_CONTROL);
  if (contentType) {
    res.setHeader('Content-Type', contentType);
  }
  res.send(buffer);
};

export const handleResizeImage = async (
  req: Request,
  res: Response,
  deps: Required<ImageResizerDeps>,
) => {
  const width = parseImageWidth(req.query['w']);
  const key = req.query['path'];
  if (width === null) {
    res.status(400).json({error: 'Invalid width: expected an integer between 16 and 1600'});
    return;
  }
  if (!isValidImageKey(key)) {
    res.status(400).json({error: 'Invalid image path'});
    return;
  }
  const variantKey = variantKeyFor(key, width);
  try {
    const cached = await deps.storage.download(variantKey);
    if (cached) {
      sendImage(res, cached.buffer, cached.contentType);
      return;
    }
  } catch (error) {
    logger.warn({err: error, key: variantKey}, 'Resized variant cache check failed');
  }

  let original: Awaited<ReturnType<ImageStorage['download']>>;
  try {
    original = await deps.storage.download(key);
  } catch (error) {
    logger.warn({err: error, key}, 'Original image download failed');
    original = null;
  }
  if (!original) {
    res.status(404).json({error: 'Image not found'});
    return;
  }

  try {
    const resized = await deps.resize(original.buffer, width);
    // Upload the variant in the same request lifecycle; failure is not fatal.
    try {
      await deps.storage.upload(variantKey, resized.buffer, resized.contentType);
    } catch (error) {
      logger.warn({err: error, key: variantKey}, 'Failed to cache resized image variant');
    }
    sendImage(res, resized.buffer, resized.contentType);
  } catch (error) {
    // Never error the image: fall back to the original bytes.
    logger.warn({err: error, key}, 'Image resize failed; serving original');
    sendImage(res, original.buffer, original.contentType);
  }
};

export const createImageResizerRouter = (deps: ImageResizerDeps = {}) => {
  const resolved: Required<ImageResizerDeps> = {
    storage: deps.storage ?? supabaseImageStorage,
    resize: deps.resize ?? sharpResize,
  };
  const router = Router();
  router.get('/resize', (req, res) => handleResizeImage(req, res, resolved));
  return router;
};

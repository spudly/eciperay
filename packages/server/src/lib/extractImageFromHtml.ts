import {load} from 'cheerio';

import {looksLikeHtml} from './htmlToText.js';

const isSupportedImageSrc = (src: string) =>
  src.startsWith('http://') ||
  src.startsWith('https://') ||
  /^data:image\/(?:jpeg|png|gif|webp);base64,/i.test(src);

export const extractImageUrlFromHtml = (input: string): string | null => {
  const trimmed = input.trim();
  if (!looksLikeHtml(trimmed)) {
    return null;
  }
  const src = load(trimmed)('img').first().attr('src')?.trim();
  if (!src || !isSupportedImageSrc(src)) {
    return null;
  }
  return src;
};

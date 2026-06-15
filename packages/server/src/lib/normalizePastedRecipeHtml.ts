import {load} from 'cheerio';

import {extractImageUrlFromHtml} from './extractImageFromHtml.js';
import {looksLikeHtml} from './htmlToText.js';

const isEmbeddedImageSrc = (src: string) =>
  /^data:image\/(?:jpeg|png|gif|webp);base64,/i.test(src);

export const stripEmbeddedImagesFromHtml = (input: string): string => {
  const trimmed = input.trim();
  if (!looksLikeHtml(trimmed)) {
    return trimmed;
  }
  const $ = load(trimmed);
  $('img').each((_, element) => {
    const src = $(element).attr('src')?.trim() ?? '';
    if (isEmbeddedImageSrc(src)) {
      $(element).remove();
    }
  });
  return $.html();
};

export const normalizePastedRecipeHtml = (input: string) => {
  const imageCandidate = extractImageUrlFromHtml(input);
  return {html: stripEmbeddedImagesFromHtml(input), imageCandidate};
};

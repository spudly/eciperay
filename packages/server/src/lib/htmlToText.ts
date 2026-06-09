import {load} from 'cheerio';

export const looksLikeHtml = (text: string): boolean =>
  /<[a-z][\s\S]*>/i.test(text);

export const htmlToText = (input: string): string => {
  const trimmed = input.trim();
  if (!looksLikeHtml(trimmed)) {
    return trimmed;
  }
  return load(trimmed).text().replaceAll(/\s+/g, ' ').trim();
};

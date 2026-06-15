import {load} from 'cheerio';

export const looksLikeHtml = (text: string): boolean =>
  /<[a-z][\s\S]*>/i.test(text);

const collapseText = (text: string): string =>
  text
    .replaceAll(/[ \t]+\n/g, '\n')
    .replaceAll(/\n[ \t]+/g, '\n')
    .replaceAll(/[ \t]{2,}/g, ' ')
    .replaceAll(/\n{3,}/g, '\n\n')
    .trim();

export const htmlToText = (input: string): string => {
  const trimmed = input.trim();
  if (!looksLikeHtml(trimmed)) {
    return trimmed;
  }
  const $ = load(trimmed);
  $('br').replaceWith('\n');
  $('ol > li').each((index, element) => {
    const current = $(element).text().trim();
    $(element).text(`${index + 1}. ${current}`);
  });
  $('ul > li').each((_, element) => {
    const current = $(element).text().trim();
    $(element).text(`• ${current}`);
  });
  $('p, li, h1, h2, h3, h4').each((_, element) => {
    $(element).append('\n');
  });
  return collapseText($.root().text());
};

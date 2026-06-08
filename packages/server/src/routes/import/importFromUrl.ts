import type {Response} from 'express';
import {load} from 'cheerio';

import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {parseSchemaOrg} from '../../lib/parseSchemaOrg.js';
import {parseWithClaude} from '../../lib/parseWithClaude.js';
import {ImportUrlSchema, validate} from '../../lib/schemas.js';

const fetchPage = async (url: string): Promise<string> => {
  const response = await fetch(url, {
    headers: {'User-Agent': 'RecipooBot/1.0'},
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
};

const parseFromHtml = async (html: string, url: string) => {
  const $ = load(html);
  const schemaResult = parseSchemaOrg($);
  if (schemaResult) {
    return {...schemaResult, sourceUrl: url};
  }
  const pageText = $('body').text().replaceAll(/\s+/g, ' ').trim();
  return parseWithClaude(pageText, url);
};

export const importFromUrl = async (req: AuthedRequest, res: Response) => {
  const body = validate(ImportUrlSchema, req, res);
  if (!body.ok) {
    return;
  }
  const {url} = body.data;
  const html = await fetchPage(url);
  res.json(await parseFromHtml(html, url));
};

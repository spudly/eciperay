import type {Response} from 'express';
import {load} from 'cheerio';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {parseSchemaOrg} from '../../lib/parseSchemaOrg.js';
import {parseWithClaude} from '../../lib/parseWithClaude.js';
import {RecipeImportError} from '../../lib/recipeImportToInput.js';
import {prepareImportedRecipeInput} from '../../lib/prepareImportedRecipeInput.js';
import {saveNewRecipeFromInput} from '../../lib/saveRecipeFromInput.js';
import {ImportUrlSchema, validate} from '../../lib/schemas.js';

type QueryFn = typeof defaultQuery;

const fetchPage = async (url: string): Promise<string> => {
  const response = await fetch(url, {
    headers: {'User-Agent': 'EciperayBot/1.0'},
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

export const importFromUrl = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(ImportUrlSchema, req, res);
  if (!body.ok) {
    return;
  }
  const {url} = body.data;
  const html = await fetchPage(url);
  const parsed = await parseFromHtml(html, url);
  try {
    const input = await prepareImportedRecipeInput({
      recipe: parsed,
      userId: req.userId,
      queryFn,
      options: {sourceUrl: url},
    });
    const {recipeId, versionId, recipe} = await saveNewRecipeFromInput(
      {userId: req.userId, input, createdVia: 'import_url'},
      queryFn,
    );
    res.status(201).json({...recipe, recipeId, versionId});
  } catch (error) {
    if (error instanceof RecipeImportError) {
      res.status(422).json({error: error.message});
      return;
    }
    throw error;
  }
};

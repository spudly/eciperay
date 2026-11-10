import type {Response} from 'express';
import {load} from 'cheerio';

import {query as defaultQuery} from '../../db/query.js';
import {
  checkRecipeCap,
  consumeAiCall,
  quotaExhaustedBody,
  refundAiCall,
  withRecipeCap,
} from '../../lib/aiMetering.js';
import type {EntitledRequest} from '../../middleware/loadEntitlement.js';
import {parseSchemaOrg} from '../../lib/parseSchemaOrg.js';
import {parseWithClaude} from '../../lib/parseWithClaude.js';
import {RecipeImportError} from '../../lib/recipeImportToInput.js';
import {prepareImportedRecipeInput} from '../../lib/prepareImportedRecipeInput.js';
import {saveNewRecipeFromInput} from '../../lib/saveRecipeFromInput.js';
import {ImportUrlSchema, validate} from '../../lib/schemas.js';
import {AiResponseParseError} from '../../lib/validate.js';
import {findDuplicateRecipe} from '../../lib/findDuplicateRecipe.js';
import {duplicateRecipeBody} from './respondIfDuplicateImport.js';

type QueryFn = typeof defaultQuery;

// User-actionable URL-import failures (#297). These map to 422s here in
// the route instead of escaping to the global error handler, which can
// only emit the generic 'AI service error' / 'Internal server error'
// strings and gives the user nothing to act on.
export const URL_IMPORT_FETCH_ERROR =
  "We couldn't fetch that page — the site may be blocking imports. Try pasting the recipe text instead.";
export const URL_IMPORT_NO_RECIPE_ERROR =
  "That page doesn't appear to contain a recipe.";

// Some recipe sites refuse the bot user agent from datacenter IPs
// (#400: browneyedbaker.com answered 403 to EciperayBot while serving
// browsers normally, which surfaced to the user as a 500 before #297
// and as a fetch-failure 422 after it). When the site answers with a
// bot-style refusal, retry once with ordinary browser headers before
// giving up; a refusal of the browser request too is a genuine fetch
// failure and keeps the #297 422 mapping.
const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};
const BOT_REFUSAL_STATUSES = new Set([401, 403, 429]);

const fetchDirect = async (url: string): Promise<string> => {
  const response = await fetch(url, {
    headers: {'User-Agent': 'EciperayBot/1.0'},
    signal: AbortSignal.timeout(10_000),
  });
  if (response.ok) {
    return response.text();
  }
  if (!BOT_REFUSAL_STATUSES.has(response.status)) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  // Release the refused response's connection for reuse before retrying.
  await response.body?.cancel().catch(() => undefined);
  const retry = await fetch(url, {
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(10_000),
  });
  if (!retry.ok) {
    await retry.body?.cancel().catch(() => undefined);
    throw new Error(`Failed to fetch ${url}: ${retry.status}`);
  }
  return retry.text();
};

// Crawlbase fallback (#476, Stephen's adjustment 2026-11-09): the proxy
// is used ONLY when the direct fetches above have already failed, so
// Crawlbase tokens are spent only on pages that block direct imports.
// When CRAWLBASE_TOKEN is unset the direct behavior is exactly as
// before. The token travels in the proxy request URL, so that URL is
// never logged and never appears in an error message.
const fetchViaCrawlbase = async (url: string): Promise<string> => {
  const token = process.env['CRAWLBASE_TOKEN']?.trim();
  if (!token) {
    throw new Error(`Failed to fetch ${url}`);
  }
  const proxyUrl = `https://api.crawlbase.com/?token=${encodeURIComponent(token)}&url=${encodeURIComponent(url)}`;
  const response = await fetch(proxyUrl, {
    signal: AbortSignal.timeout(30_000),
  });
  const originalStatus = Number(
    response.headers.get('original-status') ??
      response.headers.get('original_status'),
  );
  if (!response.ok || (originalStatus >= 400 && originalStatus < 600)) {
    await response.body?.cancel().catch(() => undefined);
    const status =
      originalStatus >= 400 && originalStatus < 600
        ? originalStatus
        : response.status;
    throw new Error(`Failed to fetch ${url}: ${status}`);
  }
  return response.text();
};

const fetchPage = async (url: string): Promise<string> => {
  try {
    return await fetchDirect(url);
  } catch (directError) {
    if (!process.env['CRAWLBASE_TOKEN']?.trim()) {
      throw directError;
    }
    try {
      return await fetchViaCrawlbase(url);
    } catch {
      // The direct failure is the user-relevant one; the proxy attempt
      // (and its token-bearing URL) must not leak into errors or logs.
      throw directError;
    }
  }
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
  req: EntitledRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(ImportUrlSchema, req, res);
  if (!body.ok) {
    return;
  }
  const {url, allowDuplicate} = body.data;
  // URL imports create recipes, so the Free recipe cap applies. Check up
  // front so we fail fast before fetching the page or burning AI quota; the
  // save below re-checks atomically against concurrent imports.
  const earlyCap = await checkRecipeCap(
    req.userId,
    req.entitlement.plan,
    queryFn,
  );
  if (!earlyCap.ok) {
    res
      .status(402)
      .json(quotaExhaustedBody('recipe_limit', earlyCap.used, earlyCap.limit));
    return;
  }
  // A fetch failure (non-OK status, blocked scraper, network error,
  // timeout) is the site's answer, not a server fault: report it as
  // such instead of letting it escape as a generic 500 (#297).
  let html: string;
  try {
    html = await fetchPage(url);
  } catch {
    res.status(422).json({error: URL_IMPORT_FETCH_ERROR});
    return;
  }
  // The schema.org path is free; only the Claude fallback burns AI quota.
  // The parse itself is synchronous and cheap, so check up front.
  const needsAi = parseSchemaOrg(load(html)) === null;
  let aiConsumed = false;
  let aiPeriodStart: string | undefined;
  if (needsAi) {
    const quota = await consumeAiCall(
      req.userId,
      req.entitlement.plan,
      queryFn,
      {unlimited: req.entitlement.unlimited},
    );
    if (!quota.ok) {
      res
        .status(402)
        .json({
          ...quotaExhaustedBody('ai_quota_exhausted', quota.used, quota.limit),
          message:
            'AI import quota exhausted for this month. Pages with recipe markup still import for free.',
        });
      return;
    }
    aiConsumed = true;
    aiPeriodStart = quota.periodStart;
  }
  try {
    const parsed = await parseFromHtml(html, url);
    const result = await withRecipeCap(
      req.userId,
      req.entitlement.plan,
      queryFn,
      async q => {
        const input = await prepareImportedRecipeInput({
          recipe: parsed,
          userId: req.userId,
          queryFn: q,
          options: {sourceUrl: url},
        });
        // Duplicate warning (#296): checked inside the cap callback so a
        // warned import never saves; the match rides out as a sentinel
        // because this handler responds after the cap scope closes.
        const duplicate = allowDuplicate
          ? null
          : await findDuplicateRecipe(req.userId, input, q);
        if (duplicate) {
          return {kind: 'duplicate', duplicate} as const;
        }
        const saved = await saveNewRecipeFromInput(
          {userId: req.userId, input, createdVia: 'import_url'},
          q,
        );
        return {kind: 'saved', saved} as const;
      },
    );
    if (!result.ok) {
      res
        .status(402)
        .json(quotaExhaustedBody('recipe_limit', result.used, result.limit));
      return;
    }
    if (result.value.kind === 'duplicate') {
      // No AI refund on the duplicate path (#296): when the Claude
      // fallback consumed a call, the parse succeeded, so it stays
      // charged — refunding it would let repeated imports of an
      // already-owned recipe bypass the monthly quota (same as the
      // text/image paths). The schema.org path consumed no AI call.
      res.status(409).json(duplicateRecipeBody(result.value.duplicate));
      return;
    }
    const {recipeId, versionId, recipe} = result.value.saved;
    res.status(201).json({...recipe, recipeId, versionId});
  } catch (error) {
    if (aiConsumed) {
      await refundAiCall(req.userId, queryFn, aiPeriodStart);
    }
    if (error instanceof RecipeImportError) {
      res.status(422).json({error: error.message});
      return;
    }
    // The Claude fallback produced no schema-valid recipe from the
    // page text: the page doesn't contain a recipe (or not one the
    // parser can read). Say so instead of the global handler's
    // 'AI service error', which is reserved for genuine provider
    // failures (Anthropic.APIError still rethrows to it) (#297).
    if (error instanceof AiResponseParseError) {
      res.status(422).json({error: URL_IMPORT_NO_RECIPE_ERROR});
      return;
    }
    throw error;
  }
};

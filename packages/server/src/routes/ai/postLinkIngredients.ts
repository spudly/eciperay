import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {
  consumeAiCall,
  quotaExhaustedBody,
  refundAiCall,
} from '../../lib/aiMetering.js';
import {linkIngredientsWithAi} from '../../lib/linkIngredientsWithAi.js';
import type {EntitledRequest} from '../../middleware/loadEntitlement.js';

type QueryFn = typeof defaultQuery;

type LinkableIngredient = {id: string; name: string};
type LinkableInstruction = {id: string; body: string};

const isLinkableList = (
  value: unknown,
  key: 'name' | 'body',
): value is {id: string}[] =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as {id?: unknown}).id === 'string' &&
      typeof (item as Record<string, unknown>)[key] === 'string',
  );

/**
 * POST /recipes/:id/ai/link-ingredients (#643 tranche 2b).
 *
 * Body: {ingredients: [{id, name}], instructions: [{id, body}]} — the
 * version the author is editing, supplied by the client (same shape the
 * editor already holds). Returns the AI linking proposal
 * ({links, unreferencedIngredientIds}); nothing is stored — the author
 * accepts/saves the proposal through the normal version-edit path.
 */
export const postLinkIngredients = async (
  req: EntitledRequest,
  res: Response,
  queryFn: QueryFn = defaultQuery,
) => {
  const body = (req.body ?? {}) as {
    ingredients?: unknown;
    instructions?: unknown;
  };
  if (
    !isLinkableList(body.ingredients, 'name') ||
    !isLinkableList(body.instructions, 'body') ||
    body.ingredients.length === 0 ||
    body.instructions.length === 0
  ) {
    res.status(400).json({
      error: 'Provide non-empty ingredients and instructions arrays',
    });
    return;
  }
  const quota = await consumeAiCall(req.userId, req.entitlement.plan, queryFn, {
    unlimited: req.entitlement.unlimited,
  });
  if (!quota.ok) {
    res
      .status(402)
      .json(quotaExhaustedBody('ai_quota_exhausted', quota.used, quota.limit));
    return;
  }
  try {
    const proposal = await linkIngredientsWithAi(
      body.ingredients as LinkableIngredient[],
      body.instructions as LinkableInstruction[],
    );
    res.json(proposal);
  } catch (error) {
    await refundAiCall(req.userId, queryFn, quota.periodStart);
    throw error;
  }
};

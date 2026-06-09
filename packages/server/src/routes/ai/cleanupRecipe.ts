import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {anthropic, HAIKU} from '../../lib/anthropic.js';
import {buildRecipeContext} from '../../lib/buildRecipeContext.js';
import {getParam} from '../../lib/getParam.js';
import {fetchRecipeDetail} from '../../lib/recipeQueries.js';
import {AiCleanupResponseSchema, parseAiJson} from '../../lib/schemas.js';
import {mapRowToRecipeDraft} from '../../lib/mapRowToRecipeDraft.js';
import {saveDraft} from '../../lib/saveDraft.js';

type QueryFn = typeof defaultQuery;

const SYSTEM = `You are a culinary editor. Improve recipe structure and instructions for clarity.
Return ONLY JSON: {"summary_of_changes": string, "diff": {title?,description?,ingredients?,instructions?}}
Return only the fields that need improvement.`;

const callClaude = async (recipeContext: string) => {
  const response = await anthropic.messages.create({
    model: HAIKU,
    max_tokens: 2048,
    system: SYSTEM,
    messages: [
      {role: 'user', content: `Improve this recipe:\n${recipeContext}`},
    ],
  });
  const content = response.content[0];
  /* c8 ignore next 3 -- Claude returns non-text blocks only on API errors */
  if (content?.type !== 'text') {
    throw new Error('Unexpected Claude response');
  }
  return parseAiJson(AiCleanupResponseSchema, content.text);
};

const processCleanup = async (
  recipeId: string,
  userId: string,
  queryFn: QueryFn,
) => {
  const recipe = await fetchRecipeDetail(recipeId, userId, queryFn);
  if (!recipe) {
    return null;
  }
  const result = await callClaude(buildRecipeContext(recipe));
  const draft = await saveDraft(
    {
      recipeId,
      snapshot: recipe,
      diff: result.diff,
      trigger: 'ai_cleanup',
      summary: result.summary_of_changes,
    },
    queryFn,
  );
  const row = draft.rows[0];
  if (!row) {
    throw new Error('Failed to save draft');
  }
  return mapRowToRecipeDraft(row as Parameters<typeof mapRowToRecipeDraft>[0]);
};

export const cleanupRecipe = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const draft = await processCleanup(getParam(req, 'id'), req.userId, queryFn);
  if (!draft) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }
  res.json({draft});
};

import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {
  consumeAiCall,
  quotaExhaustedBody,
  refundAiCall,
} from '../../lib/aiMetering.js';
import type {EntitledRequest} from '../../middleware/loadEntitlement.js';
import {anthropic, HAIKU} from '../../lib/anthropic.js';
import {AiSubstitutionsResponseSchema, parseAiJson} from '../../lib/schemas.js';

type QueryFn = typeof defaultQuery;

const callClaude = async (missing: string[]) => {
  const prompt = `Suggest practical substitutions for these missing ingredients: ${missing.join(', ')}.
Return ONLY JSON array: [{"ingredient": string, "suggestions": [string, string, string]}]`;
  const response = await anthropic.messages.create({
    model: HAIKU,
    max_tokens: 1024,
    messages: [{role: 'user', content: prompt}],
  });
  const content = response.content[0];
  /* c8 ignore next 3 -- Claude returns non-text blocks only on API errors */
  if (content?.type !== 'text') {
    throw new Error('Unexpected Claude response');
  }
  return parseAiJson(AiSubstitutionsResponseSchema, content.text);
};

export const getSubstitutions = async (
  req: EntitledRequest,
  res: Response,
  queryFn: QueryFn = defaultQuery,
) => {
  const missing = [req.query['missing']].flat().filter(Boolean) as string[];
  if (missing.length === 0) {
    res.status(400).json({error: 'Provide at least one missing ingredient'});
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
    const substitutions = await callClaude(missing);
    res.json(substitutions);
  } catch (error) {
    await refundAiCall(req.userId, queryFn, quota.periodStart);
    throw error;
  }
};

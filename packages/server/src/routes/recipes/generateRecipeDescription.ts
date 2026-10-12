import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {
  consumeAiCall,
  quotaExhaustedBody,
  refundAiCall,
} from '../../lib/aiMetering.js';
import type {EntitledRequest} from '../../middleware/loadEntitlement.js';
import {generateRecipeDescription} from '../../lib/generateRecipeDescription.js';
import {GenerateRecipeDescriptionSchema, validate} from '../../lib/schemas.js';

type QueryFn = typeof defaultQuery;

export const generateRecipeDescriptionRoute = async (
  req: EntitledRequest,
  res: Response,
  queryFn: QueryFn = defaultQuery,
) => {
  const body = validate(GenerateRecipeDescriptionSchema, req, res);
  if (!body.ok) {
    return;
  }
  const quota = await consumeAiCall(req.userId, req.entitlement.plan, queryFn);
  if (!quota.ok) {
    res
      .status(402)
      .json(quotaExhaustedBody('ai_quota_exhausted', quota.used, quota.limit));
    return;
  }
  try {
    const description = await generateRecipeDescription(body.data);
    res.json({description});
  } catch (error_) {
    await refundAiCall(req.userId, queryFn);
    res
      .status(502)
      .json({
        error:
          error_ instanceof Error
            ? error_.message
            : 'Description generation failed',
      });
  }
};

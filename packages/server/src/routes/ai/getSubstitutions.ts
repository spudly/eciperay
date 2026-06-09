import type {Response} from 'express';

import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {anthropic, HAIKU} from '../../lib/anthropic.js';
import {AiSubstitutionsResponseSchema, parseAiJson} from '../../lib/schemas.js';

const callClaude = async (missing: string[]) => {
  const prompt = `Suggest practical substitutions for these missing ingredients: ${missing.join(', ')}.
Return ONLY JSON array: [{"ingredient": string, "suggestions": [string, string, string]}]`;
  const response = await anthropic.messages.create({
    model: HAIKU,
    max_tokens: 1024,
    messages: [{role: 'user', content: prompt}],
  });
  const content = response.content[0];
  /* c8 ignore next 3 */
  if (content?.type !== 'text') {
    throw new Error('Unexpected Claude response');
  }
  return parseAiJson(AiSubstitutionsResponseSchema, content.text);
};

export const getSubstitutions = async (req: AuthedRequest, res: Response) => {
  const missing = [req.query['missing']].flat().filter(Boolean) as string[];
  if (missing.length === 0) {
    res.status(400).json({error: 'Provide at least one missing ingredient'});
    return;
  }
  const substitutions = await callClaude(missing);
  res.json(substitutions);
};

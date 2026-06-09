import type {Response} from 'express';

import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {generateRecipeImagePrompt} from '../../lib/generateRecipeImagePrompt.js';
import {generateRecipeImageWithOpenAi} from '../../lib/generateRecipeImageWithOpenAi.js';
import {GenerateRecipeImageSchema, validate} from '../../lib/schemas.js';

export const generateRecipeImage = async (
  req: AuthedRequest,
  res: Response,
) => {
  const body = validate(GenerateRecipeImageSchema, req, res);
  if (!body.ok) {
    return;
  }
  try {
    const prompt = await generateRecipeImagePrompt(body.data);
    const image = await generateRecipeImageWithOpenAi(prompt);
    res.json(image);
  } catch (error_) {
    res
      .status(502)
      .json({
        error:
          error_ instanceof Error ? error_.message : 'Image generation failed',
      });
  }
};

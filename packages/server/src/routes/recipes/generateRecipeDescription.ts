import type {Response} from 'express';

import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {generateRecipeDescription} from '../../lib/generateRecipeDescription.js';
import {GenerateRecipeDescriptionSchema, validate} from '../../lib/schemas.js';

export const generateRecipeDescriptionRoute = async (
  req: AuthedRequest,
  res: Response,
) => {
  const body = validate(GenerateRecipeDescriptionSchema, req, res);
  if (!body.ok) {
    return;
  }
  try {
    const description = await generateRecipeDescription(body.data);
    res.json({description});
  } catch (error_) {
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

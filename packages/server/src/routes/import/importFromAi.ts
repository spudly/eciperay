import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {generateRecipeWithClaude} from '../../lib/generateRecipeWithClaude.js';
import {RecipeImportError} from '../../lib/recipeImportToInput.js';
import {prepareImportedRecipeInput} from '../../lib/prepareImportedRecipeInput.js';
import {saveRecipeFromInput} from '../../lib/saveRecipeFromInput.js';
import {ImportAiSchema, validate} from '../../lib/schemas.js';

type QueryFn = typeof defaultQuery;

export const importFromAi = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(ImportAiSchema, req, res);
  if (!body.ok) {
    return;
  }
  const parsed = await generateRecipeWithClaude(body.data.prompt);
  try {
    const input = await prepareImportedRecipeInput({
      recipe: parsed,
      userId: req.userId,
      queryFn,
    });
    const detail = await saveRecipeFromInput(
      {userId: req.userId, input},
      queryFn,
    );
    res.status(201).json(detail);
  } catch (error) {
    if (error instanceof RecipeImportError) {
      res.status(422).json({error: error.message});
      return;
    }
    throw error;
  }
};

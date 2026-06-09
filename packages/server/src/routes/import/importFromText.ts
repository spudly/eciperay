import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {extractImageUrlFromHtml} from '../../lib/extractImageFromHtml.js';
import {htmlToText} from '../../lib/htmlToText.js';
import {mapRowToRecipeDetail} from '../../lib/mapRowToRecipeDetail.js';
import {parseWithClaude} from '../../lib/parseWithClaude.js';
import {RecipeImportError} from '../../lib/recipeImportToInput.js';
import {prepareImportedRecipeInput} from '../../lib/prepareImportedRecipeInput.js';
import {saveRecipeFromInput} from '../../lib/saveRecipeFromInput.js';
import {
  IMPORT_TEXT_PLAIN_MAX,
  ImportTextSchema,
  validate,
} from '../../lib/schemas.js';
import {resolveImportedImageUrl} from '../../lib/uploadRecipeImageServer.js';
import {GET_RECIPE_DETAIL_SQL, setRecipeImageUrl} from '../recipes/queries.js';

type QueryFn = typeof defaultQuery;

export const importFromText = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(ImportTextSchema, req, res);
  if (!body.ok) {
    return;
  }
  const rawText = body.data.text;
  const imageCandidate = extractImageUrlFromHtml(rawText);
  const plainText = htmlToText(rawText);
  if (plainText.length === 0) {
    res
      .status(400)
      .json({error: 'No recipe text found after removing formatting'});
    return;
  }
  if (plainText.length > IMPORT_TEXT_PLAIN_MAX) {
    res
      .status(400)
      .json({
        error: 'Validation failed',
        issues: [
          {
            path: 'text',
            message: `Too big: expected at most ${IMPORT_TEXT_PLAIN_MAX} characters of recipe content`,
          },
        ],
      });
    return;
  }
  const parsed = await parseWithClaude(plainText, null);
  try {
    const input = await prepareImportedRecipeInput({
      recipe: parsed,
      userId: req.userId,
      queryFn,
    });
    let detail = await saveRecipeFromInput(
      {userId: req.userId, input},
      queryFn,
    );
    if (imageCandidate) {
      const imageUrl = await resolveImportedImageUrl(
        imageCandidate,
        req.supabaseUid,
        detail.id,
      );
      if (imageUrl) {
        await setRecipeImageUrl(detail.id, req.userId, imageUrl, queryFn);
        const refreshed = await queryFn(GET_RECIPE_DETAIL_SQL, [
          detail.id,
          req.userId,
        ]);
        const row = refreshed.rows[0];
        if (row) {
          detail = mapRowToRecipeDetail(
            row as Parameters<typeof mapRowToRecipeDetail>[0],
          );
        }
      }
    }
    res.status(201).json(detail);
  } catch (error) {
    if (error instanceof RecipeImportError) {
      res.status(422).json({error: error.message});
      return;
    }
    throw error;
  }
};

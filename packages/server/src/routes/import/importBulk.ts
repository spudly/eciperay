import type {Response} from 'express';
import type {BulkImportResult, RecipeDetail} from '@recipoo/types';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {mapRowToRecipeDetail} from '../../lib/mapRowToRecipeDetail.js';
import {recipeExportRecordToInput} from '../../lib/recipeExportRecordToInput.js';
import {resolveTagIdsByNames} from '../../lib/resolveTagIdsByNames.js';
import {saveRecipeFromInput} from '../../lib/saveRecipeFromInput.js';
import {BulkImportSchema, validate} from '../../lib/schemas.js';
import {resolveImportedImageUrl} from '../../lib/uploadRecipeImageServer.js';
import {GET_RECIPE_DETAIL_SQL, setRecipeImageUrl} from '../recipes/queries.js';

type QueryFn = typeof defaultQuery;

export const refreshRecipeDetail = async (
  recipeId: string,
  userId: string,
  queryFn: QueryFn,
): Promise<RecipeDetail | null> => {
  const refreshed = await queryFn(GET_RECIPE_DETAIL_SQL, [recipeId, userId]);
  const row = refreshed.rows[0];
  if (!row) {
    return null;
  }
  return mapRowToRecipeDetail(
    row as Parameters<typeof mapRowToRecipeDetail>[0],
  );
};

export const importBulk = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(BulkImportSchema, req, res);
  if (!body.ok) {
    return;
  }

  const created: BulkImportResult['created'] = [];
  const errors: BulkImportResult['errors'] = [];

  for (let index = 0; index < body.data.recipes.length; index++) {
    const record = body.data.recipes[index];
    /* c8 ignore next 3 -- validated schema guarantees dense recipe arrays */
    if (!record) {
      continue;
    }
    try {
      const tagIds = await resolveTagIdsByNames(
        req.userId,
        record.tags,
        queryFn,
      );
      const input = recipeExportRecordToInput(record, tagIds);
      let detail = await saveRecipeFromInput(
        {userId: req.userId, input},
        queryFn,
      );

      if (record.image) {
        const dataUrl = `data:${record.image.contentType};base64,${record.image.base64}`;
        const imageUrl = await resolveImportedImageUrl(
          dataUrl,
          req.supabaseUid,
          detail.id,
        );
        if (imageUrl) {
          await setRecipeImageUrl(detail.id, req.userId, imageUrl, queryFn);
          const refreshed = await refreshRecipeDetail(
            detail.id,
            req.userId,
            queryFn,
          );
          if (refreshed) {
            detail = refreshed;
          }
        }
      }

      created.push({id: detail.id, title: detail.title});
    } catch (error) {
      errors.push({
        index,
        title: record.title,
        message: error instanceof Error ? error.message : 'Import failed',
      });
    }
  }

  res.status(201).json({created, errors} satisfies BulkImportResult);
};

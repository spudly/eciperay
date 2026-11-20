import type {RecipeVersionDetail} from '@eciperay/types';
import type {Response} from 'express';

import {runTransactional} from '../../db/withTransaction.js';
import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {fetchVersionDetail} from '../../lib/fetchVersionDetail.js';
import {getParam} from '../../lib/getParam.js';
import {mapRowToRecipeDetail} from '../../lib/mapRowToRecipeDetail.js';
import {slugifyRecipeTitle} from '../../lib/slugifyRecipeTitle.js';

import {GET_RECIPE_DETAIL_SQL} from './queries.js';
import {setActiveVersion, updateRecipeSlug} from './versionQueries.js';

type QueryFn = typeof defaultQuery;

/**
 * Whether the owner may activate this version directly (#417).
 *
 * Three paths qualify:
 *
 * - Candidate: a newer version with cook logs — the original cook-log path,
 *   unchanged.
 * - Archived: a version that was active before; the previously active version
 *   stays re-activatable.
 *
 * A plain Draft version qualifies on no path: it must be cooked into a
 * candidate first.
 */
const isActivatable = (version: RecipeVersionDetail): boolean =>
  (version.derivedRole === 'candidate' && version.cookLogCount > 0) ||
  version.derivedRole === 'archived';

export const activateVersion = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const recipeId = getParam(req, 'id');
  const versionId = getParam(req, 'versionId');
  const version = await fetchVersionDetail(
    versionId,
    recipeId,
    req.userId,
    queryFn,
  );
  if (!version) {
    res.status(404).json({error: 'Version not found'});
    return;
  }
  if (version.derivedRole === 'active') {
    res.status(409).json({error: 'This version is already active'});
    return;
  }
  if (!isActivatable(version)) {
    res
      .status(409)
      .json({
        error:
          'Draft versions cannot be activated directly — log a cook against the version',
      });
    return;
  }
  await runTransactional(queryFn, async q => {
    await setActiveVersion(recipeId, versionId, q);
    // The lineage slug follows the active version's title. A draft renamed
    // without activation (e.g. an MCP version edit, #410) has not moved the
    // slug, so activation is where it catches up.
    await updateRecipeSlug(recipeId, slugifyRecipeTitle(version.title), q);
  });
  const recipe = await queryFn(GET_RECIPE_DETAIL_SQL, [recipeId, req.userId]);
  const row = recipe.rows[0];
  if (!row) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }
  res.json(
    mapRowToRecipeDetail(row as Parameters<typeof mapRowToRecipeDetail>[0]),
  );
};

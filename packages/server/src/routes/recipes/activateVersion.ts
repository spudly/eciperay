import type {RecipeVersionDetail} from '@eciperay/types';
import type {Response} from 'express';

import {runTransactional} from '../../db/withTransaction.js';
import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {recipeEditBlockedError} from '../../lib/assertRecipeEditable.js';
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
 * - Any saved version of a Perfected recipe: marking a recipe Perfected is the
 *   owner's statement that its content is settled, so a newer saved version
 *   (still labelled Draft in the picker because it has no cook logs) can be
 *   promoted without pretending to cook it. This is the direct path #417 adds;
 *   it deliberately carves activation out of the Perfected content lock (#418),
 *   which still governs edits.
 *
 * A Draft version of a recipe that is not Perfected qualifies on no path: it
 * must be Perfected first, or cooked into a candidate.
 */
const isActivatable = (version: RecipeVersionDetail): boolean =>
  (version.derivedRole === 'candidate' && version.cookLogCount > 0) ||
  version.derivedRole === 'archived' ||
  version.status === 'perfected';

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
  if (version.status === 'abandoned') {
    res.status(409).json({error: recipeEditBlockedError()});
    return;
  }
  if (!isActivatable(version)) {
    res
      .status(409)
      .json({
        error:
          'Draft versions cannot be activated directly — mark the recipe Perfected first, or log a cook against the version',
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

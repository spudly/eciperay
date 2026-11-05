import type {Response} from 'express';

import {runTransactional} from '../../db/withTransaction.js';
import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {
  isRecipeEditable,
  recipeEditBlockedError,
} from '../../lib/assertRecipeEditable.js';
import {fetchVersionDetail} from '../../lib/fetchVersionDetail.js';
import {getParam} from '../../lib/getParam.js';
import {
  isVersionEditable,
  versionEditBlockedError,
} from '../../lib/isVersionEditable.js';
import {mapRowToRecipeDetail} from '../../lib/mapRowToRecipeDetail.js';
import {scheduleNutritionRefresh} from '../../lib/refreshRecipeNutrition.js';
import {RecipeVersionEditInputSchema, validate} from '../../lib/schemas.js';
import {slugifyRecipeTitle} from '../../lib/slugifyRecipeTitle.js';
import {touchMealsForRecipe} from '../../lib/touchMealsForRecipe.js';

import {
  GET_RECIPE_DETAIL_SQL,
  deleteIngredientsByVersionId,
  deleteInstructionsByVersionId,
  deleteRecipeTagsByVersionId,
  insertIngredients,
  insertInstructions,
  linkTags,
} from './queries.js';
import {updateRecipeStatus} from './recipeStatusQueries.js';
import {
  getNextVersionNumber,
  incrementContentRevision,
  insertVersion,
  reopenPerfectedLineage,
  setActiveVersion,
  setLineageStatus,
  updateRecipeSlug,
  updateVersion,
} from './versionQueries.js';

import type {RecipeVersionInput} from '@eciperay/types';

type QueryFn = typeof defaultQuery;

type EditInput = RecipeVersionInput & {activate?: boolean};

const replaceChildren = async (
  versionId: string,
  input: EditInput,
  queryFn: QueryFn,
) => {
  await deleteIngredientsByVersionId(versionId, queryFn);
  await deleteInstructionsByVersionId(versionId, queryFn);
  await deleteRecipeTagsByVersionId(versionId, queryFn);
  await insertIngredients(versionId, input.ingredients, queryFn);
  await insertInstructions(versionId, input.instructions, queryFn);
  await linkTags(versionId, input.tagIds, queryFn);
};

/**
 * Atomic content edit of one explicitly named version (#410).
 *
 * The whole edit — branch or in-place write, plus optional activation — commits
 * or rolls back as one transaction, so a failed activation never leaves a
 * half-written version behind and a failed write never activates anything.
 *
 * - Naming the ACTIVE version branches: a new version is created from it carrying
 *   the submitted content/metadata (same lineage rules as createVersion: Idea
 *   promotes to Evolving, Perfected reopens conditionally). The named version
 *   itself is never modified.
 * - Naming a draft version edits it in place (same rules as putVersion).
 * - Any other version (archived, candidate, or a draft with cook logs or
 *   children) is not editable and returns 409.
 *
 * Activation is opt-in (`activate: true`); by default the edited version stays
 * a draft and the active version is untouched. When the owner asks for
 * activation here, it is applied directly: this endpoint is the owner's own
 * authenticated edit path, so the cook-log gate that guards the app-facing
 * activate endpoint does not apply (general owner activation in the app is
 * #417).
 */
export const editVersionContent = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(RecipeVersionEditInputSchema, req, res);
  if (!body.ok) {
    return;
  }
  const input = body.data;
  const recipeId = getParam(req, 'id');
  const versionId = getParam(req, 'versionId');
  const recipeResult = await queryFn(GET_RECIPE_DETAIL_SQL, [
    recipeId,
    req.userId,
  ]);
  const recipeRow = recipeResult.rows[0];
  if (!recipeRow) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }
  const recipe = mapRowToRecipeDetail(
    recipeRow as Parameters<typeof mapRowToRecipeDetail>[0],
  );
  const target = await fetchVersionDetail(
    versionId,
    recipeId,
    req.userId,
    queryFn,
  );
  if (!target) {
    res.status(404).json({error: 'Version not found'});
    return;
  }
  const activate = input.activate ?? false;
  const branchesFromActive = target.id === recipe.versionId;
  if (branchesFromActive) {
    // Mirrors createVersion: branching is the one change allowed on a
    // Perfected recipe; Abandoned stays terminal.
    if (!isRecipeEditable(recipe.status) && recipe.status !== 'perfected') {
      res.status(409).json({error: recipeEditBlockedError()});
      return;
    }
  } else if (!isVersionEditable(target, recipe.status)) {
    res.status(409).json({error: versionEditBlockedError()});
    return;
  }

  const editedVersionId = await runTransactional(queryFn, async q => {
    if (branchesFromActive) {
      const versionNumber = await getNextVersionNumber(recipeId, q);
      const created = await insertVersion(
        {
          recipeId,
          versionNumber,
          title: input.title,
          description: input.description ?? null,
          servings: input.servings,
          prepTimeMin: input.prepTimeMin ?? null,
          cookTimeMin: input.cookTimeMin ?? null,
          imageUrl: input.imageUrl ?? null,
          sourceUrl: input.sourceUrl ?? null,
          createdVia: 'tweak_manual',
          derivedFromVersionId: target.id,
        },
        q,
      );
      const newVersionId = created.rows[0]?.id;
      if (!newVersionId) {
        throw new Error('Failed to create version');
      }
      await insertIngredients(newVersionId, input.ingredients, q);
      await insertInstructions(newVersionId, input.instructions, q);
      await linkTags(newVersionId, input.tagIds, q);
      if (recipe.status === 'idea') {
        await setLineageStatus(recipeId, req.userId, 'evolving', q);
      }
      if (recipe.status === 'perfected') {
        const reopened = await reopenPerfectedLineage(recipeId, req.userId, q);
        if (!reopened.rows[0]) {
          throw new Error(
            'Recipe status changed while creating a draft version',
          );
        }
      }
      if (activate) {
        await setActiveVersion(recipeId, newVersionId, q);
        // The lineage slug follows the active version's title.
        await updateRecipeSlug(recipeId, slugifyRecipeTitle(input.title), q);
      }
      await incrementContentRevision(recipeId, q);
      await touchMealsForRecipe(recipeId, q);
      return newVersionId;
    }
    const updated = await updateVersion(
      versionId,
      {
        title: input.title,
        description: input.description ?? null,
        servings: input.servings,
        prepTimeMin: input.prepTimeMin ?? null,
        cookTimeMin: input.cookTimeMin ?? null,
        imageUrl: input.imageUrl ?? null,
        sourceUrl: input.sourceUrl ?? null,
      },
      q,
    );
    if (!updated.rows[0]) {
      throw new Error('Failed to update version');
    }
    if (input.status !== undefined) {
      await updateRecipeStatus(recipeId, input.status, q);
    }
    await incrementContentRevision(recipeId, q);
    await replaceChildren(versionId, input, q);
    await touchMealsForRecipe(recipeId, q);
    if (activate) {
      await setActiveVersion(recipeId, versionId, q);
      // The lineage slug follows the active version's title, so it moves
      // only when this edit becomes the active version.
      await updateRecipeSlug(recipeId, slugifyRecipeTitle(input.title), q);
    }
    return versionId;
  });

  scheduleNutritionRefresh(editedVersionId, queryFn);
  const detail = await fetchVersionDetail(
    editedVersionId,
    recipeId,
    req.userId,
    queryFn,
  );
  if (!detail) {
    res.status(500).json({error: 'Failed to fetch edited version'});
    return;
  }
  res.status(branchesFromActive ? 201 : 200).json(detail);
};

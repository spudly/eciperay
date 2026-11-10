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
import {
  autoImageContextFromDetail,
  scheduleAutoGenerateRecipeImage,
} from '../../lib/autoGenerateRecipeImage.js';
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

type EditInput = RecipeVersionInput & {
  activate?: boolean;
  expectedContentRevision?: number;
};

/** A 409 the client can resolve by re-reading the recipe and retrying. */
class VersionEditConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VersionEditConflictError';
  }
}

const LOCK_VERSION_SQL =
  'select id from recipe_versions where id = $1 for update';

const BUMP_REVISION_IF_CURRENT_SQL = `
  update recipes set content_revision = content_revision + 1
  where id = $1 and content_revision = $2
  returning id
`;

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
 *
 * Concurrency: the transaction locks the named version's row first (a
 * concurrent cook-log insert waits on it), then — when the caller sends
 * `expectedContentRevision`, the recipe revision its payload was built from —
 * bumps the revision only if it still matches, so an edit built from a stale
 * snapshot aborts with 409 instead of overwriting a newer edit. Eligibility
 * (active-vs-draft mode, editability) is re-read and re-checked inside the
 * transaction before any write, so state that changed after the pre-transaction
 * reads cannot slip through.
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

  let editedVersionId: string;
  try {
    editedVersionId = await runTransactional(queryFn, async q => {
      // Lock the named version's row first: a concurrent cook-log insert
      // (which takes a key-share lock on this row) waits for this
      // transaction, so the re-read below sees committed state.
      await q(LOCK_VERSION_SQL, [versionId]);
      if (input.expectedContentRevision !== undefined) {
        const bumped = await q(BUMP_REVISION_IF_CURRENT_SQL, [
          recipeId,
          input.expectedContentRevision,
        ]);
        if (!bumped.rows[0]) {
          throw new VersionEditConflictError(
            'Recipe changed since it was read; re-read the recipe and retry the edit.',
          );
        }
      }
      // Re-read and re-verify inside the transaction: the pre-transaction
      // reads above decided the 404s, but eligibility must hold at write
      // time, not at read time.
      const freshRow = (await q(GET_RECIPE_DETAIL_SQL, [recipeId, req.userId]))
        .rows[0];
      if (!freshRow) {
        throw new VersionEditConflictError(
          'Recipe changed since it was read; re-read the recipe and retry the edit.',
        );
      }
      const freshRecipe = mapRowToRecipeDetail(
        freshRow as Parameters<typeof mapRowToRecipeDetail>[0],
      );
      const freshTarget = await fetchVersionDetail(
        versionId,
        recipeId,
        req.userId,
        q,
      );
      if (!freshTarget) {
        throw new VersionEditConflictError(
          'Recipe changed since it was read; re-read the recipe and retry the edit.',
        );
      }
      const freshBranches = freshTarget.id === freshRecipe.versionId;
      if (freshBranches !== branchesFromActive) {
        throw new VersionEditConflictError(
          'The active version changed since the recipe was read; re-read the recipe and retry the edit.',
        );
      }
      if (freshBranches) {
        if (
          !isRecipeEditable(freshRecipe.status) &&
          freshRecipe.status !== 'perfected'
        ) {
          throw new VersionEditConflictError(recipeEditBlockedError());
        }
      } else if (!isVersionEditable(freshTarget, freshRecipe.status)) {
        throw new VersionEditConflictError(versionEditBlockedError());
      }
      if (input.expectedContentRevision === undefined) {
        await incrementContentRevision(recipeId, q);
      }
      if (freshBranches) {
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
        if (freshRecipe.status === 'idea') {
          await setLineageStatus(recipeId, req.userId, 'evolving', q);
        }
        if (freshRecipe.status === 'perfected') {
          const reopened = await reopenPerfectedLineage(
            recipeId,
            req.userId,
            q,
          );
          if (!reopened.rows[0]) {
            throw new VersionEditConflictError(
              'Recipe status changed while creating a draft version',
            );
          }
        }
        if (activate) {
          await setActiveVersion(recipeId, newVersionId, q);
          // The lineage slug follows the active version's title.
          await updateRecipeSlug(recipeId, slugifyRecipeTitle(input.title), q);
        }
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
  } catch (error) {
    if (error instanceof VersionEditConflictError) {
      res.status(409).json({error: error.message});
      return;
    }
    throw error;
  }

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
  // #407: a version-content save is also a recipe save — a
  // still-imageless recipe gets an auto-generated image (once per recipe).
  scheduleAutoGenerateRecipeImage(
    {
      userId: req.userId,
      supabaseUid: req.supabaseUid,
      recipe: autoImageContextFromDetail({
        ...detail,
        versionId: editedVersionId,
      }),
    },
    queryFn,
  );
  res.status(branchesFromActive ? 201 : 200).json(detail);
};

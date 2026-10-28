import {Router} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {
  loadEntitlement,
  type EntitledRequest,
} from '../../middleware/loadEntitlement.js';
import {requireAuth, type AuthedRequest} from '../../middleware/requireAuth.js';
import {requirePlan} from '../../middleware/requirePlan.js';
import {createAiRouter} from '../ai/router.js';
import {createCookLog} from '../cooks/createCookLog.js';
import {deleteCookLog} from '../cooks/deleteCookLog.js';
import {listCookLogs} from '../cooks/listCookLogs.js';

import {activateVersion} from './activateVersion.js';
import {acceptImport} from './acceptImport.js';
import {cloneRecipe} from './cloneRecipe.js';
import {createRecipeComment} from './createRecipeComment.js';
import {createRecipe} from './createRecipe.js';
import {deleteRecipeCommentRoute} from './deleteRecipeComment.js';
import {createVersion} from './createVersion.js';
import {exportRecipes} from './exportRecipes.js';
import {generateRecipeDescriptionRoute} from './generateRecipeDescription.js';
import {generateRecipeImage} from './generateRecipeImage.js';
import {deleteRecipe} from './deleteRecipe.js';
import {getRecipe} from './getRecipe.js';
import {getVersion} from './getVersion.js';
import {listRecipeCommentsRoute} from './listRecipeComments.js';
import {listRecipes} from './listRecipes.js';
import {listSharedWithMe} from './listSharedWithMe.js';
import {listVersions} from './listVersions.js';
import {patchRecipeLineage} from './patchRecipeLineage.js';
import {patchRecipeSharing} from './patchRecipeSharing.js';
import {putRecipe} from './putRecipe.js';
import {deleteRecipeRating, putRecipeRating} from './putRecipeRating.js';
import {rotateRecipeShareToken} from './rotateRecipeShareToken.js';
import {putVersion} from './putVersion.js';
import {startImportEdits} from './startImportEdits.js';
import {
  approveTweakAiPlan,
  cancelTweakAiSession,
  createTweakAiSession,
  createVersionFromTweakAiSession,
  getTweakAiSession,
  implementTweakAiSession,
  sendTweakAiMessage,
} from './tweakAiSessions.js';
import {tweakVersionWithAi} from './tweakVersionWithAi.js';
import {updateRecipeCommentRoute} from './updateRecipeComment.js';

type QueryFn = typeof defaultQuery;
const a = (req: Parameters<typeof requireAuth>[0]) => req as AuthedRequest;
const e = (req: Parameters<typeof requireAuth>[0]) => req as EntitledRequest;

export const createRecipesRouter = (queryFn: QueryFn) => {
  const router = Router();
  router.get('/', requireAuth, (req, res) => listRecipes(a(req), res, queryFn));
  router.get('/shared-with-me', requireAuth, (req, res) =>
    listSharedWithMe(a(req), res, queryFn),
  );
  router.post('/export', requireAuth, (req, res) =>
    exportRecipes(a(req), res, queryFn),
  );
  router.post('/', requireAuth, loadEntitlement(queryFn), (req, res) =>
    createRecipe(e(req), res, queryFn),
  );
  router.post(
    '/ai/generate-image',
    requireAuth,
    loadEntitlement(queryFn),
    (req, res) => generateRecipeImage(e(req), res, queryFn),
  );
  router.post(
    '/ai/generate-description',
    requireAuth,
    loadEntitlement(queryFn),
    (req, res) => generateRecipeDescriptionRoute(e(req), res, queryFn),
  );
  router.get('/:id', requireAuth, (req, res) =>
    getRecipe(a(req), res, queryFn),
  );
  router.put('/:id', requireAuth, (req, res) =>
    putRecipe(a(req), res, queryFn),
  );
  router.put('/:id/rating', requireAuth, (req, res) =>
    putRecipeRating(a(req), res, queryFn),
  );
  router.delete('/:id/rating', requireAuth, (req, res) =>
    deleteRecipeRating(a(req), res, queryFn),
  );
  router.get('/:id/comments', requireAuth, (req, res) =>
    listRecipeCommentsRoute(a(req), res, queryFn),
  );
  router.post('/:id/comments', requireAuth, (req, res) =>
    createRecipeComment(a(req), res, queryFn),
  );
  router.put('/:id/comments/:commentId', requireAuth, (req, res) =>
    updateRecipeCommentRoute(a(req), res, queryFn),
  );
  router.delete('/:id/comments/:commentId', requireAuth, (req, res) =>
    deleteRecipeCommentRoute(a(req), res, queryFn),
  );
  router.post('/:id/import/accept', requireAuth, (req, res) =>
    acceptImport(a(req), res, queryFn),
  );
  router.post('/:id/import/start-edits', requireAuth, (req, res) =>
    startImportEdits(a(req), res, queryFn),
  );
  router.post('/:id/clone', requireAuth, loadEntitlement(queryFn), (req, res) =>
    cloneRecipe(e(req), res, queryFn),
  );
  router.patch('/:id', requireAuth, (req, res) =>
    patchRecipeLineage(a(req), res, queryFn),
  );
  // Sharing is a Plus feature, but revoking sharing (going back to private)
  // is always allowed: it is a privacy operation, not a paid feature.
  // The Plus check lives in the handler so it only applies to public/unlisted.
  router.patch(
    '/:id/sharing',
    requireAuth,
    loadEntitlement(queryFn),
    (req, res) => patchRecipeSharing(e(req), res, queryFn),
  );
  router.post(
    '/:id/sharing/rotate-token',
    requireAuth,
    loadEntitlement(queryFn),
    requirePlan('plus'),
    (req, res) => rotateRecipeShareToken(a(req), res, queryFn),
  );
  router.delete('/:id', requireAuth, (req, res) =>
    deleteRecipe(a(req), res, queryFn),
  );
  router.get('/:id/versions', requireAuth, (req, res) =>
    listVersions(a(req), res, queryFn),
  );
  router.post('/:id/versions', requireAuth, (req, res) =>
    createVersion(a(req), res, queryFn),
  );
  router.post(
    '/:id/versions/ai',
    requireAuth,
    loadEntitlement(queryFn),
    (req, res) => tweakVersionWithAi(e(req), res, queryFn),
  );
  router.post(
    '/:id/tweak-ai-sessions',
    requireAuth,
    loadEntitlement(queryFn),
    (req, res) => createTweakAiSession(e(req), res, queryFn),
  );
  router.get('/:id/tweak-ai-sessions/:sessionId', requireAuth, (req, res) =>
    getTweakAiSession(a(req), res, queryFn),
  );
  router.post(
    '/:id/tweak-ai-sessions/:sessionId/messages',
    requireAuth,
    loadEntitlement(queryFn),
    (req, res) => sendTweakAiMessage(e(req), res, queryFn),
  );
  router.post(
    '/:id/tweak-ai-sessions/:sessionId/approve-plan',
    requireAuth,
    (req, res) => approveTweakAiPlan(a(req), res, queryFn),
  );
  router.post(
    '/:id/tweak-ai-sessions/:sessionId/implement',
    requireAuth,
    (req, res) => implementTweakAiSession(a(req), res, queryFn),
  );
  router.post(
    '/:id/tweak-ai-sessions/:sessionId/create-version',
    requireAuth,
    (req, res) => createVersionFromTweakAiSession(a(req), res, queryFn),
  );
  router.post(
    '/:id/tweak-ai-sessions/:sessionId/cancel',
    requireAuth,
    (req, res) => cancelTweakAiSession(a(req), res, queryFn),
  );
  router.get('/:id/versions/:versionId', requireAuth, (req, res) =>
    getVersion(a(req), res, queryFn),
  );
  router.put('/:id/versions/:versionId', requireAuth, (req, res) =>
    putVersion(a(req), res, queryFn),
  );
  router.post('/:id/versions/:versionId/activate', requireAuth, (req, res) =>
    activateVersion(a(req), res, queryFn),
  );
  router.post('/:id/versions/:versionId/cooks', requireAuth, (req, res) =>
    createCookLog(a(req), res, queryFn),
  );
  router.get('/:id/versions/:versionId/cooks', requireAuth, (req, res) =>
    listCookLogs(a(req), res, queryFn),
  );
  router.delete(
    '/:id/versions/:versionId/cooks/:cookLogId',
    requireAuth,
    (req, res) => deleteCookLog(a(req), res, queryFn),
  );
  router.use('/:id/ai', createAiRouter(queryFn));
  return router;
};

import {Router} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {requireAuth, type AuthedRequest} from '../../middleware/requireAuth.js';
import {createAiRouter} from '../ai/router.js';
import {createCookLog} from '../cooks/createCookLog.js';
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

export const createRecipesRouter = (queryFn: QueryFn) => {
  const router = Router();
  router.get('/', requireAuth, (req, res) => listRecipes(a(req), res, queryFn));
  router.get('/shared-with-me', requireAuth, (req, res) =>
    listSharedWithMe(a(req), res, queryFn),
  );
  router.post('/export', requireAuth, (req, res) =>
    exportRecipes(a(req), res, queryFn),
  );
  router.post('/', requireAuth, (req, res) =>
    createRecipe(a(req), res, queryFn),
  );
  router.post('/ai/generate-image', requireAuth, (req, res) =>
    generateRecipeImage(a(req), res),
  );
  router.post('/ai/generate-description', requireAuth, (req, res) =>
    generateRecipeDescriptionRoute(a(req), res),
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
  router.post('/:id/clone', requireAuth, (req, res) =>
    cloneRecipe(a(req), res, queryFn),
  );
  router.patch('/:id', requireAuth, (req, res) =>
    patchRecipeLineage(a(req), res, queryFn),
  );
  router.patch('/:id/sharing', requireAuth, (req, res) =>
    patchRecipeSharing(a(req), res, queryFn),
  );
  router.post('/:id/sharing/rotate-token', requireAuth, (req, res) =>
    rotateRecipeShareToken(a(req), res, queryFn),
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
  router.post('/:id/versions/ai', requireAuth, (req, res) =>
    tweakVersionWithAi(a(req), res, queryFn),
  );
  router.post('/:id/tweak-ai-sessions', requireAuth, (req, res) =>
    createTweakAiSession(a(req), res, queryFn),
  );
  router.get('/:id/tweak-ai-sessions/:sessionId', requireAuth, (req, res) =>
    getTweakAiSession(a(req), res, queryFn),
  );
  router.post(
    '/:id/tweak-ai-sessions/:sessionId/messages',
    requireAuth,
    (req, res) => sendTweakAiMessage(a(req), res, queryFn),
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
  router.use('/:id/ai', createAiRouter(queryFn));
  return router;
};

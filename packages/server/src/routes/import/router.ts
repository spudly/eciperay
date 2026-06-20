import {Router, type NextFunction, type Request, type Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {requireAuth, type AuthedRequest} from '../../middleware/requireAuth.js';

import {
  approveCreateAiPlan,
  cancelCreateAiSession,
  createCreateAiSession,
  createRecipeFromCreateAiSession,
  getCreateAiSession,
  sendCreateAiMessage,
} from './createAiSessions.js';
import {importFromImage} from './importFromImage.js';
import {importBulk} from './importBulk.js';
import {importFromText} from './importFromText.js';
import {importFromUrl} from './importFromUrl.js';

type QueryFn = typeof defaultQuery;

export const createImportRouter = (queryFn: QueryFn = defaultQuery) => {
  const router = Router();
  const asAuthed = (req: Parameters<typeof requireAuth>[0]) =>
    req as AuthedRequest;

  const runImport =
    (handler: (req: AuthedRequest, res: Response) => Promise<void>) =>
    (req: Request, res: Response, next: NextFunction) => {
      void handler(asAuthed(req), res).catch(next);
    };

  router.post(
    '/url',
    requireAuth,
    runImport((req, res) => importFromUrl(req, res, queryFn)),
  );
  router.post(
    '/image',
    requireAuth,
    runImport((req, res) => importFromImage(req, res, queryFn)),
  );
  router.post(
    '/text',
    requireAuth,
    runImport((req, res) => importFromText(req, res, queryFn)),
  );
  router.post(
    '/bulk',
    requireAuth,
    runImport((req, res) => importBulk(req, res, queryFn)),
  );
  router.post(
    '/ai/sessions',
    requireAuth,
    runImport((req, res) => createCreateAiSession(req, res, queryFn)),
  );
  router.get(
    '/ai/sessions/:sessionId',
    requireAuth,
    runImport((req, res) => getCreateAiSession(req, res, queryFn)),
  );
  router.post(
    '/ai/sessions/:sessionId/messages',
    requireAuth,
    runImport((req, res) => sendCreateAiMessage(req, res, queryFn)),
  );
  router.post(
    '/ai/sessions/:sessionId/approve-plan',
    requireAuth,
    runImport((req, res) => approveCreateAiPlan(req, res, queryFn)),
  );
  router.post(
    '/ai/sessions/:sessionId/create-recipe',
    requireAuth,
    runImport((req, res) => createRecipeFromCreateAiSession(req, res, queryFn)),
  );
  router.post(
    '/ai/sessions/:sessionId/cancel',
    requireAuth,
    runImport((req, res) => cancelCreateAiSession(req, res, queryFn)),
  );

  return router;
};

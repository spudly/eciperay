import {Router, type NextFunction, type Request, type Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {
  loadEntitlement,
  type EntitledRequest,
} from '../../middleware/loadEntitlement.js';
import {requireAuth, type AuthedRequest} from '../../middleware/requireAuth.js';
import {requirePlan} from '../../middleware/requirePlan.js';

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
  const asEntitled = (req: Parameters<typeof requireAuth>[0]) =>
    req as EntitledRequest;

  const runImport =
    (handler: (req: AuthedRequest, res: Response) => Promise<void>) =>
    (req: Request, res: Response, next: NextFunction) => {
      void handler(asAuthed(req), res).catch(next);
    };

  const runMeteredImport =
    (handler: (req: EntitledRequest, res: Response) => Promise<void>) =>
    (req: Request, res: Response, next: NextFunction) => {
      void handler(asEntitled(req), res).catch(next);
    };

  const metered = loadEntitlement(queryFn);

  router.post(
    '/url',
    requireAuth,
    metered,
    runMeteredImport((req, res) => importFromUrl(req, res, queryFn)),
  );
  router.post(
    '/image',
    requireAuth,
    metered,
    requirePlan('plus'),
    runMeteredImport((req, res) => importFromImage(req, res, queryFn)),
  );
  router.post(
    '/text',
    requireAuth,
    metered,
    requirePlan('plus'),
    runMeteredImport((req, res) => importFromText(req, res, queryFn)),
  );
  router.post(
    '/bulk',
    requireAuth,
    metered,
    requirePlan('plus'),
    runImport((req, res) => importBulk(req, res, queryFn)),
  );
  router.post(
    '/ai/sessions',
    requireAuth,
    metered,
    requirePlan('plus'),
    runMeteredImport((req, res) => createCreateAiSession(req, res, queryFn)),
  );
  router.get(
    '/ai/sessions/:sessionId',
    requireAuth,
    runImport((req, res) => getCreateAiSession(req, res, queryFn)),
  );
  router.post(
    '/ai/sessions/:sessionId/messages',
    requireAuth,
    metered,
    requirePlan('plus'),
    runMeteredImport((req, res) => sendCreateAiMessage(req, res, queryFn)),
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

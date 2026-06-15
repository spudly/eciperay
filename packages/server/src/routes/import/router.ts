import {Router, type NextFunction, type Request, type Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {requireAuth, type AuthedRequest} from '../../middleware/requireAuth.js';

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

  return router;
};

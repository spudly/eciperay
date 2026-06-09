import {Router} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {requireAuth, type AuthedRequest} from '../../middleware/requireAuth.js';

import {importFromImage} from './importFromImage.js';
import {importFromUrl} from './importFromUrl.js';

type QueryFn = typeof defaultQuery;

export const createImportRouter = (queryFn: QueryFn = defaultQuery) => {
  const router = Router();
  const asAuthed = (req: Parameters<typeof requireAuth>[0]) =>
    req as AuthedRequest;

  router.post('/url', requireAuth, (req, res) =>
    importFromUrl(asAuthed(req), res, queryFn),
  );
  router.post('/image', requireAuth, (req, res) =>
    importFromImage(asAuthed(req), res, queryFn),
  );

  return router;
};

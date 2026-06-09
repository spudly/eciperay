import {Router} from 'express';

import {requireAuth, type AuthedRequest} from '../../middleware/requireAuth.js';

import {importFromImage} from './importFromImage.js';
import {importFromUrl} from './importFromUrl.js';

export const createImportRouter = () => {
  const router = Router();
  const asAuthed = (req: Parameters<typeof requireAuth>[0]) =>
    req as AuthedRequest;

  router.post('/url', requireAuth, (req, res) =>
    importFromUrl(asAuthed(req), res),
  );
  router.post('/image', requireAuth, (req, res) =>
    importFromImage(asAuthed(req), res),
  );

  return router;
};

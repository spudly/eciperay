import {Router} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {requireAuth, type AuthedRequest} from '../../middleware/requireAuth.js';
import {createNote} from '../notes/createNote.js';
import {listNotes} from '../notes/listNotes.js';
import {createAiRouter} from '../ai/router.js';

import {approveDraft, rejectDraft} from './approveDraft.js';
import {createRecipe} from './createRecipe.js';
import {exportRecipes} from './exportRecipes.js';
import {generateRecipeImage} from './generateRecipeImage.js';
import {deleteRecipe} from './deleteRecipe.js';
import {getRecipe} from './getRecipe.js';
import {listDrafts} from './listDrafts.js';
import {listRecipes} from './listRecipes.js';
import {putRecipe} from './putRecipe.js';
import {updateRecipe} from './updateRecipe.js';

type QueryFn = typeof defaultQuery;
const a = (req: Parameters<typeof requireAuth>[0]) => req as AuthedRequest;

export const createRecipesRouter = (queryFn: QueryFn) => {
  const router = Router();
  router.get('/', requireAuth, (req, res) => listRecipes(a(req), res, queryFn));
  router.post('/export', requireAuth, (req, res) =>
    exportRecipes(a(req), res, queryFn),
  );
  router.post('/', requireAuth, (req, res) =>
    createRecipe(a(req), res, queryFn),
  );
  router.post('/ai/generate-image', requireAuth, (req, res) =>
    generateRecipeImage(a(req), res),
  );
  router.get('/:id', requireAuth, (req, res) =>
    getRecipe(a(req), res, queryFn),
  );
  router.put('/:id', requireAuth, (req, res) =>
    putRecipe(a(req), res, queryFn),
  );
  router.patch('/:id', requireAuth, (req, res) =>
    updateRecipe(a(req), res, queryFn),
  );
  router.delete('/:id', requireAuth, (req, res) =>
    deleteRecipe(a(req), res, queryFn),
  );
  router.get('/:id/notes', requireAuth, (req, res) =>
    listNotes(a(req), res, queryFn),
  );
  router.post('/:id/notes', requireAuth, (req, res) =>
    createNote(a(req), res, queryFn),
  );
  router.get('/:id/drafts', requireAuth, (req, res) =>
    listDrafts(a(req), res, queryFn),
  );
  router.post('/:id/drafts/:draftId/approve', requireAuth, (req, res) =>
    approveDraft(a(req), res, queryFn),
  );
  router.post('/:id/drafts/:draftId/reject', requireAuth, (req, res) =>
    rejectDraft(a(req), res, queryFn),
  );
  router.use('/:id/ai', createAiRouter(queryFn));
  return router;
};

import {Router} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {requireAuth, type AuthedRequest} from '../../middleware/requireAuth.js';

import {chatRecipe} from './chatRecipe.js';
import {cleanupRecipe} from './cleanupRecipe.js';
import {getConversation} from './getConversation.js';
import {getNutrition} from './getNutrition.js';
import {getSubstitutions} from './getSubstitutions.js';

type QueryFn = typeof defaultQuery;

const a = (req: Parameters<typeof requireAuth>[0]) => req as AuthedRequest;

export const createAiRouter = (queryFn: QueryFn) => {
  const router = Router({mergeParams: true});
  router.get('/conversation', requireAuth, (req, res) =>
    getConversation(a(req), res, queryFn),
  );
  router.post('/chat', requireAuth, (req, res) =>
    chatRecipe(a(req), res, queryFn),
  );
  router.post('/cleanup', requireAuth, (req, res) =>
    cleanupRecipe(a(req), res, queryFn),
  );
  router.get('/nutrition', requireAuth, (req, res) =>
    getNutrition(a(req), res, queryFn),
  );
  router.get('/substitutions', requireAuth, (req, res) =>
    getSubstitutions(a(req), res),
  );
  return router;
};

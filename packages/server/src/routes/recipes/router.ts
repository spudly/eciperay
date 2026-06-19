import {Router} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {requireAuth, type AuthedRequest} from '../../middleware/requireAuth.js';
import {createAiRouter} from '../ai/router.js';
import {createCookLog} from '../cooks/createCookLog.js';
import {listCookLogs} from '../cooks/listCookLogs.js';

import {activateVersion} from './activateVersion.js';
import {createRecipe} from './createRecipe.js';
import {createVersion} from './createVersion.js';
import {exportRecipes} from './exportRecipes.js';
import {generateRecipeDescriptionRoute} from './generateRecipeDescription.js';
import {generateRecipeImage} from './generateRecipeImage.js';
import {deleteRecipe} from './deleteRecipe.js';
import {getRecipe} from './getRecipe.js';
import {getVersion} from './getVersion.js';
import {listRecipes} from './listRecipes.js';
import {listVersions} from './listVersions.js';
import {patchRecipeLineage} from './patchRecipeLineage.js';
import {putRecipe} from './putRecipe.js';
import {putVersion} from './putVersion.js';
import {tweakVersionWithAi} from './tweakVersionWithAi.js';

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
  router.post('/ai/generate-description', requireAuth, (req, res) =>
    generateRecipeDescriptionRoute(a(req), res),
  );
  router.get('/:id', requireAuth, (req, res) =>
    getRecipe(a(req), res, queryFn),
  );
  router.put('/:id', requireAuth, (req, res) =>
    putRecipe(a(req), res, queryFn),
  );
  router.patch('/:id', requireAuth, (req, res) =>
    patchRecipeLineage(a(req), res, queryFn),
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

import './loadEnv.js';

import {fileURLToPath} from 'node:url';

import cors from 'cors';
import express from 'express';

import {query as defaultQuery} from './db/query.js';
import {createAuthRouter} from './routes/auth/router.js';
import {createImportRouter} from './routes/import/router.js';
import {createRecipesRouter} from './routes/recipes/router.js';
import {createTagsRouter} from './routes/tags/router.js';

const DEFAULT_PORT = 8080;
const DEFAULT_CORS_ORIGINS = 'http://localhost:8081';

type AppDeps = {query: typeof defaultQuery};

export const createApp = ({
  query: queryFn = defaultQuery,
}: Partial<AppDeps> = {}) => {
  const app = express();
  const corsOrigins = (process.env['CORS_ORIGINS'] ?? DEFAULT_CORS_ORIGINS)
    .split(',')
    .map(origin => origin.trim());
  app.use(cors({origin: corsOrigins}));
  app.use(express.json({limit: '10mb'}));
  app.get('/health', (_req, res) => {
    res.json({status: 'ok'});
  });
  app.use('/auth', createAuthRouter(queryFn));
  app.use('/recipes/import', createImportRouter(queryFn));
  app.use('/recipes', createRecipesRouter(queryFn));
  app.use('/tags', createTagsRouter(queryFn));
  return app;
};

// startServer and the entry-point guard are excluded from test coverage:
// tests import createApp directly and never invoke the HTTP listener.
/* c8 ignore next 11 */
const startServer = () => {
  const app = createApp();
  const port = Number(process.env['PORT'] ?? DEFAULT_PORT);
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer();
}

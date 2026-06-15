import './loadEnv.js';

import {fileURLToPath} from 'node:url';

import Anthropic from '@anthropic-ai/sdk';
import cors from 'cors';
import express from 'express';
import type {NextFunction, Request, Response} from 'express';

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
  app.locals['query'] = queryFn;
  if (process.env['NODE_ENV'] === 'test') {
    app.locals['skipUserUpsert'] = true;
  }
  const corsOrigins = (process.env['CORS_ORIGINS'] ?? DEFAULT_CORS_ORIGINS)
    .split(',')
    .map(origin => origin.trim());
  app.use(cors({origin: corsOrigins}));
  app.use(express.json({limit: '50mb'}));
  app.get('/health', (_req, res) => {
    res.json({status: 'ok'});
  });
  app.use('/auth', createAuthRouter(queryFn));
  app.use('/recipes/import', createImportRouter(queryFn));
  app.use('/recipes', createRecipesRouter(queryFn));
  app.use('/tags', createTagsRouter(queryFn));
  app.use(handleUnexpectedError);
  return app;
};

export const handleUnexpectedError = (
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  void next;
  if (res.headersSent) {
    return;
  }
  if (err instanceof Anthropic.APIError) {
    res.status(502).json({error: 'AI service error'});
    return;
  }
  if (process.env['NODE_ENV'] !== 'test') {
    console.error(err);
  }
  res.status(500).json({error: 'Internal server error'});
};

/* c8 ignore next 11 -- HTTP listener; tests import createApp via supertest only */
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

import './loadEnv.js';

import {fileURLToPath} from 'node:url';

import Anthropic from '@anthropic-ai/sdk';
import cors from 'cors';
import express from 'express';
import type {NextFunction, Request, Response} from 'express';

import {API_PREFIX} from './apiPrefix.js';
import {query as defaultQuery} from './db/query.js';
import {attachPostHogExpress, captureServerException} from './lib/posthog.js';
import {initPostHogLogs, serverLog} from './lib/posthogLogs.js';
import {logServerSecretsOnStartup} from './lib/serverSecrets.js';
import {AiResponseParseError} from './lib/validate.js';
import {createAuthRouter} from './routes/auth/router.js';
import {createImportRouter} from './routes/import/router.js';
import {createPublicRecipesRouter} from './routes/public/router.js';
import {createRecipesRouter} from './routes/recipes/router.js';
import {createTagsRouter} from './routes/tags/router.js';
import {attachWebStatic, isWebDistAvailable} from './staticWeb.js';

const DEFAULT_PORT = 8080;
const DEFAULT_CORS_ORIGINS = 'http://localhost:8081';

type AppDeps = {query: typeof defaultQuery; serveWeb: boolean};

export const createApp = ({
  query: queryFn = defaultQuery,
  serveWeb = process.env['NODE_ENV'] === 'production' && isWebDistAvailable(),
}: Partial<AppDeps> = {}) => {
  const app = express();
  app.locals['query'] = queryFn;
  if (process.env['NODE_ENV'] === 'test') {
    app.locals['skipUserUpsert'] = true;
  }
  attachPostHogExpress(app);
  const corsOrigins = (process.env['CORS_ORIGINS'] ?? DEFAULT_CORS_ORIGINS)
    .split(',')
    .map(origin => origin.trim());
  app.use(cors({origin: corsOrigins}));
  app.use(express.json({limit: '50mb'}));

  const api = express.Router();
  api.get('/health', (_req, res) => {
    res.json({status: 'ok'});
  });
  api.use('/auth', createAuthRouter(queryFn));
  api.use('/recipes/import', createImportRouter(queryFn));
  api.use('/public/recipes', createPublicRecipesRouter(queryFn));
  api.use('/recipes', createRecipesRouter(queryFn));
  api.use('/tags', createTagsRouter(queryFn));
  api.use((_req, res) => {
    res.status(404).json({error: 'Not found'});
  });
  app.use(API_PREFIX, api);
  app.use(handleUnexpectedError);

  if (serveWeb) {
    attachWebStatic(app);
  }

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
  if (
    err instanceof Anthropic.APIError ||
    err instanceof AiResponseParseError
  ) {
    serverLog('warn', 'AI service error', {
      status:
        err instanceof Anthropic.APIError && typeof err.status === 'number'
          ? err.status
          : 0,
    });
    res.status(502).json({error: 'AI service error'});
    return;
  }
  captureServerException(err);
  if (process.env['NODE_ENV'] !== 'test') {
    serverLog('error', 'Unhandled server error', {
      message: err instanceof Error ? err.message : 'unknown error',
      ...(err instanceof Error && err.stack ? {stack: err.stack} : {}),
    });
  }
  res.status(500).json({error: 'Internal server error'});
};

/* c8 ignore start -- HTTP listener entrypoint; tests import createApp via supertest only */
const startServer = () => {
  initPostHogLogs();
  logServerSecretsOnStartup();
  const app = createApp();
  const port = Number(process.env['PORT'] ?? DEFAULT_PORT);
  const host = process.env['HOST'] ?? '0.0.0.0';
  app.listen(port, host, () => {
    console.log(`Server listening on http://${host}:${port}`);
  });
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer();
}
/* c8 ignore stop -- HTTP listener entrypoint */

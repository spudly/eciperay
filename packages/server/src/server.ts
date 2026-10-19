import './loadEnv.js';

import {fileURLToPath} from 'node:url';

import Anthropic from '@anthropic-ai/sdk';
import {createMcpRouter} from '@eciperay/mcp-server/http';
import cors from 'cors';
import express from 'express';
import type {NextFunction, Request, Response} from 'express';

import {API_PREFIX} from './apiPrefix.js';
import {loadEntitlement} from './middleware/loadEntitlement.js';
import {requireAuth} from './middleware/requireAuth.js';
import {requirePlan} from './middleware/requirePlan.js';
import {query as defaultQuery} from './db/query.js';
import {assertPaddleConfig} from './lib/paddleConfig.js';
import {attachPostHogExpress, captureServerException} from './lib/posthog.js';
import {httpLogger, logger, toLoggableUrl} from './lib/logger.js';
import {initPostHogLogs, serverLog} from './lib/posthogLogs.js';
import {logServerSecretsOnStartup} from './lib/serverSecrets.js';
import {AiResponseParseError} from './lib/validate.js';
import {createAccountRouter} from './routes/account/router.js';
import {createAuthRouter} from './routes/auth/router.js';
import {createBillingRouter} from './routes/billing/router.js';
import {createImportRouter} from './routes/import/router.js';
import {createMealPlansRouter} from './routes/mealPlans/router.js';
import {createMealsRouter} from './routes/meals/router.js';
import {createPublicRecipesRouter} from './routes/public/router.js';
import {createRecipesRouter} from './routes/recipes/router.js';
import {attachSeoRoutes} from './routes/seo/attachSeoRoutes.js';
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
  app.use(httpLogger);
  const corsOrigins = (process.env['CORS_ORIGINS'] ?? DEFAULT_CORS_ORIGINS)
    .split(',')
    .map(origin => origin.trim());
  app.use(cors({origin: corsOrigins}));
  app.use(
    express.json({
      limit: '50mb',
      // Stash the raw body so the Paddle webhook route can verify the
      // HMAC-SHA256 signature, which is computed over the raw bytes. Only the
      // webhook needs it — retaining a raw buffer for every request (up to
      // 50 MB image imports) would needlessly double memory per request.
      verify: (req, _res, buf) => {
        // req.url is always defined in Express; template literal avoids a
        // nullish branch for coverage.
        const url = `${req.url}`;
        if (
          url === '/api/billing/paddle-webhook' ||
          url.startsWith('/api/billing/paddle-webhook?')
        ) {
          (req as Request & {rawBody?: Buffer}).rawBody = buf;
        }
      },
    }),
  );

  const api = express.Router();
  api.get('/health', (_req, res) => {
    res.json({status: 'ok'});
  });
  api.use('/auth', createAuthRouter(queryFn));
  api.use('/account', createAccountRouter(queryFn));
  api.use('/billing', createBillingRouter(queryFn));
  api.use('/recipes/import', createImportRouter(queryFn));
  api.use('/public/recipes', createPublicRecipesRouter(queryFn));
  api.use('/recipes', createRecipesRouter(queryFn));
  api.use('/meals', createMealsRouter(queryFn));
  api.use('/meal-plans', createMealPlansRouter(queryFn));
  api.use('/tags', createTagsRouter(queryFn));
  api.use(
    '/mcp',
    requireAuth,
    loadEntitlement(queryFn),
    requirePlan('power'),
    createMcpRouter({
      apiUrl: `http://localhost:${process.env['PORT'] ?? DEFAULT_PORT}`,
    }),
  );
  api.use((_req, res) => {
    res.status(404).json({error: 'Not found'});
  });
  app.use(API_PREFIX, api);
  attachSeoRoutes(app, queryFn);
  app.use(handleUnexpectedError);

  if (serveWeb) {
    attachWebStatic(app);
  }

  return app;
};

export const handleUnexpectedError = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (res.headersSent) {
    return;
  }
  if (
    err instanceof Anthropic.APIError ||
    err instanceof AiResponseParseError
  ) {
    serverLog('warn', 'AI service error', {
      method: req.method,
      path: toLoggableUrl(req.originalUrl),
      status:
        err instanceof Anthropic.APIError && typeof err.status === 'number'
          ? err.status
          : 0,
    });
    res.status(502).json({error: 'AI service error'});
    return;
  }
  captureServerException(err);
  // Always log to stdout via pino — independent of POSTHOG_KEY, so a 500
  // is never invisible in the local terminal (issue #79).
  (req.log ?? logger).error(
    {err, method: req.method, path: toLoggableUrl(req.originalUrl)},
    'Unhandled server error',
  );
  if (process.env['NODE_ENV'] !== 'test') {
    serverLog('error', 'Unhandled server error', {
      method: req.method,
      path: toLoggableUrl(req.originalUrl),
      message: err instanceof Error ? err.message : 'unknown error',
      ...(err instanceof Error && err.stack ? {stack: err.stack} : {}),
    });
  }
  res.status(500).json({error: 'Internal server error'});
};

/* c8 ignore start -- HTTP listener entrypoint; tests import createApp via supertest only */
const startServer = () => {
  // Fail fast on a half-finished Paddle live cutover (production mode
  // without the live secrets, or a mismatched API base) instead of
  // booting a server whose billing silently cannot work.
  assertPaddleConfig();
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

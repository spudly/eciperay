import {mkdirSync, rmSync, writeFileSync} from 'node:fs';
import path from 'node:path';

import {jest} from '@jest/globals';
import Anthropic from '@anthropic-ai/sdk';
import type {RequestHandler} from 'express';
import request from 'supertest';

import {createApp, handleUnexpectedError} from './server.js';
import {shutdownPostHogLogs} from './lib/posthogLogs.js';
import {AiResponseParseError} from './lib/validate.js';
import {WEB_DIST_DIR} from './staticWeb.js';

const withTestRoute = (path: string, handler: RequestHandler) => {
  const app = createApp({serveWeb: false});
  app.get(path, handler);
  app.use(handleUnexpectedError);
  return app;
};

describe('createApp', () => {
  test('GET /api/health returns {status: ok}', async () => {
    const app = createApp();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({status: 'ok'});
  });

  test('serves the built web app when dist is present', async () => {
    mkdirSync(WEB_DIST_DIR, {recursive: true});
    writeFileSync(
      path.join(WEB_DIST_DIR, 'index.html'),
      '<!DOCTYPE html><html><body>root</body></html>',
    );

    try {
      const app = createApp({serveWeb: true});
      const res = await request(app).get('/recipes');
      expect(res.status).toBe(200);
      expect(res.text).toContain('root');
    } finally {
      rmSync(WEB_DIST_DIR, {recursive: true, force: true});
    }
  });

  test('enables static web serving in production when dist is present', async () => {
    const previousNodeEnv = process.env['NODE_ENV'];
    mkdirSync(WEB_DIST_DIR, {recursive: true});
    writeFileSync(
      path.join(WEB_DIST_DIR, 'index.html'),
      '<!DOCTYPE html><html><body>prod</body></html>',
    );
    process.env['NODE_ENV'] = 'production';

    try {
      const app = createApp();
      const res = await request(app).get('/recipes');
      expect(res.status).toBe(200);
      expect(res.text).toContain('prod');
    } finally {
      process.env['NODE_ENV'] = previousNodeEnv;
      rmSync(WEB_DIST_DIR, {recursive: true, force: true});
    }
  });

  test('uses default CORS origins when env unset', () => {
    const previous = process.env['CORS_ORIGINS'];
    delete process.env['CORS_ORIGINS'];
    expect(() => createApp()).not.toThrow();
    if (previous === undefined) {
      delete process.env['CORS_ORIGINS'];
    } else {
      process.env['CORS_ORIGINS'] = previous;
    }
  });

  test('uses CORS_ORIGINS from env', () => {
    const previous = process.env['CORS_ORIGINS'];
    process.env['CORS_ORIGINS'] = 'http://a.com,http://b.com';
    expect(() => createApp()).not.toThrow();
    if (previous === undefined) {
      delete process.env['CORS_ORIGINS'];
    } else {
      process.env['CORS_ORIGINS'] = previous;
    }
  });

  test('returns 404 JSON for unknown API routes', async () => {
    const app = createApp();
    const res = await request(app).get('/api/unknown');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({error: 'Not found'});
  });

  test('returns 404 for unknown routes', async () => {
    const app = createApp();
    const res = await request(app).get('/does-not-exist');
    expect(res.status).toBe(404);
  });

  test('returns 500 for unexpected route errors', async () => {
    const app = withTestRoute('/test-error', () => {
      throw new Error('boom');
    });
    const res = await request(app).get('/test-error');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({error: 'Internal server error'});
  });

  test('returns 502 for Anthropic API errors', async () => {
    const app = withTestRoute('/test-ai-error', () => {
      throw new Anthropic.APIError(500, undefined, 'AI failed', undefined);
    });
    const res = await request(app).get('/test-ai-error');
    expect(res.status).toBe(502);
    expect(res.body).toEqual({error: 'AI service error'});
  });

  test('returns 502 for invalid AI response parsing', async () => {
    const app = withTestRoute('/test-ai-parse-error', () => {
      throw new AiResponseParseError(new Error('bad ai json'));
    });
    const res = await request(app).get('/test-ai-parse-error');
    expect(res.status).toBe(502);
    expect(res.body).toEqual({error: 'AI service error'});
  });

  test('returns 502 when Anthropic error status is not numeric', async () => {
    const app = withTestRoute('/test-ai-error-bad-status', () => {
      const err = new Anthropic.APIError(
        500,
        undefined,
        'AI failed',
        undefined,
      );
      (err as {status: unknown}).status = 'bad';
      throw err;
    });
    const res = await request(app).get('/test-ai-error-bad-status');
    expect(res.status).toBe(502);
    expect(res.body).toEqual({error: 'AI service error'});
  });

  test('does not send a second response when headers were already sent', async () => {
    const app = withTestRoute('/test-headers-sent', (_req, res, next) => {
      res.status(200).end();
      next(new Error('too late'));
    });
    const res = await request(app).get('/test-headers-sent');
    expect(res.status).toBe(200);
  });

  test('logs unexpected errors outside test mode', async () => {
    const previousNodeEnv = process.env['NODE_ENV'];
    const previousPostHogKey = process.env['POSTHOG_KEY'];
    process.env['NODE_ENV'] = 'production';
    process.env['POSTHOG_KEY'] = '';
    await shutdownPostHogLogs();
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const app = withTestRoute('/test-prod-error', () => {
      throw new Error('production failure');
    });
    const res = await request(app).get('/test-prod-error');
    expect(res.status).toBe(500);
    expect(consoleError).toHaveBeenCalledWith('Unhandled server error', {
      method: 'GET',
      path: '/test-prod-error',
      message: 'production failure',
      stack: expect.stringContaining('production failure'),
    });
    consoleError.mockRestore();
    if (previousNodeEnv === undefined) {
      delete process.env['NODE_ENV'];
    } else {
      process.env['NODE_ENV'] = previousNodeEnv;
    }
    if (previousPostHogKey === undefined) {
      delete process.env['POSTHOG_KEY'];
    } else {
      process.env['POSTHOG_KEY'] = previousPostHogKey;
    }
  });

  test('logs unknown error values outside test mode', async () => {
    const previousNodeEnv = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'production';
    await shutdownPostHogLogs();
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const app = withTestRoute(
      '/test-prod-unknown-error',
      (_req, _res, next) => {
        next('not-an-error');
      },
    );
    const res = await request(app).get('/test-prod-unknown-error');
    expect(res.status).toBe(500);
    expect(consoleError).toHaveBeenCalledWith('Unhandled server error', {
      method: 'GET',
      path: '/test-prod-unknown-error',
      message: 'unknown error',
    });
    consoleError.mockRestore();
    if (previousNodeEnv === undefined) {
      delete process.env['NODE_ENV'];
    } else {
      process.env['NODE_ENV'] = previousNodeEnv;
    }
  });
});

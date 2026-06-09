import {jest} from '@jest/globals';
import Anthropic from '@anthropic-ai/sdk';
import type {RequestHandler} from 'express';
import request from 'supertest';

import {createApp, handleUnexpectedError} from './server.js';

const withTestRoute = (path: string, handler: RequestHandler) => {
  const app = createApp();
  app.get(path, handler);
  app.use(handleUnexpectedError);
  return app;
};

describe('createApp', () => {
  test('GET /health returns {status: ok}', async () => {
    const app = createApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({status: 'ok'});
  });

  test('creates an app without throwing', () => {
    expect(() => createApp()).not.toThrow();
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
    process.env['NODE_ENV'] = 'production';
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const app = withTestRoute('/test-prod-error', () => {
      throw new Error('production failure');
    });
    const res = await request(app).get('/test-prod-error');
    expect(res.status).toBe(500);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
    if (previousNodeEnv === undefined) {
      delete process.env['NODE_ENV'];
    } else {
      process.env['NODE_ENV'] = previousNodeEnv;
    }
  });
});

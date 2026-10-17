import {Writable} from 'node:stream';

import express from 'express';
import request from 'supertest';

import {
  createHttpLogger,
  createLogger,
  isHealthCheckUrl,
  resolveLogLevel,
  toLoggableUrl,
} from './logger.js';

const captureStream = () => {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(chunk.toString());
      callback();
    },
  });
  const lines = async (): Promise<Record<string, unknown>[]> => {
    // pino writes asynchronously; give pending writes a tick to flush.
    await new Promise(resolve => setImmediate(resolve));
    return chunks
      .join('')
      .split('\n')
      .filter(line => line.length > 0)
      .map(line => JSON.parse(line) as Record<string, unknown>);
  };
  return {stream, lines};
};

describe('resolveLogLevel', () => {
  test('LOG_LEVEL wins over NODE_ENV', () => {
    expect(resolveLogLevel({LOG_LEVEL: 'warn', NODE_ENV: 'test'})).toBe('warn');
  });

  test('silent in tests by default', () => {
    expect(resolveLogLevel({NODE_ENV: 'test'})).toBe('silent');
  });

  test('info in production by default', () => {
    expect(resolveLogLevel({NODE_ENV: 'production'})).toBe('info');
  });

  test('debug otherwise', () => {
    expect(resolveLogLevel({NODE_ENV: 'development'})).toBe('debug');
    expect(resolveLogLevel({})).toBe('debug');
  });
});

describe('createLogger', () => {
  test('applies the resolved level', () => {
    const {stream} = captureStream();
    expect(createLogger({NODE_ENV: 'production'}, stream).level).toBe('info');
    expect(createLogger({NODE_ENV: 'test'}, stream).level).toBe('silent');
  });

  test('uses pino-pretty output in development without a destination', () => {
    const log = createLogger({NODE_ENV: 'development'});
    expect(log.level).toBe('debug');
    expect(typeof log.info).toBe('function');
  });
});

describe('isHealthCheckUrl', () => {
  test('matches the health endpoint, with or without a query string', () => {
    expect(isHealthCheckUrl('/api/health')).toBe(true);
    expect(isHealthCheckUrl('/api/health?probe=1')).toBe(true);
  });

  test('does not match other urls', () => {
    expect(isHealthCheckUrl('/api/recipes')).toBe(false);
    expect(isHealthCheckUrl('/api/healthz')).toBe(false);
    expect(isHealthCheckUrl(undefined)).toBe(false);
  });
});

describe('toLoggableUrl', () => {
  test('strips the query string', () => {
    expect(toLoggableUrl('/api/recipes?t=share-secret')).toBe('/api/recipes');
  });

  test('keeps urls without a query string unchanged', () => {
    expect(toLoggableUrl('/api/recipes')).toBe('/api/recipes');
  });

  test('returns an empty string for a missing url', () => {
    expect(toLoggableUrl(undefined)).toBe('');
  });
});

describe('createHttpLogger', () => {
  const buildApp = () => {
    const {stream, lines} = captureStream();
    const log = createLogger({NODE_ENV: 'production'}, stream);
    const app = express();
    app.use(createHttpLogger(log));
    app.get('/api/health', (_req, res) => {
      res.json({status: 'ok'});
    });
    app.get('/api/recipes', (_req, res) => {
      res.json([]);
    });
    return {app, lines};
  };

  test('logs method, path, status and duration for API requests', async () => {
    const {app, lines} = buildApp();
    const res = await request(app).get('/api/recipes');
    expect(res.status).toBe(200);
    const entries = await lines();
    const access = entries.find(entry => entry['msg'] === 'request completed');
    expect(access).toBeDefined();
    const req = access?.['req'] as Record<string, unknown>;
    const resInfo = access?.['res'] as Record<string, unknown>;
    expect(req['method']).toBe('GET');
    expect(req['url']).toBe('/api/recipes');
    expect(resInfo['statusCode']).toBe(200);
    expect(typeof access?.['responseTime']).toBe('number');
  });

  test('never logs credentials or query-string tokens', async () => {
    const {stream, lines} = captureStream();
    const log = createLogger({NODE_ENV: 'production'}, stream);
    const app = express();
    app.use(createHttpLogger(log));
    app.get('/api/recipes', (_req, res) => {
      res.json([]);
    });
    const res = await request(app)
      .get('/api/recipes?t=share-secret')
      .set('Authorization', 'Bearer <REDACTED_SECRET>')
      .set('Cookie', 'session=cookie-secret');
    expect(res.status).toBe(200);
    const entries = await lines();
    const access = entries.find(entry => entry['msg'] === 'request completed');
    expect(access).toBeDefined();
    const req = access?.['req'] as Record<string, unknown>;
    expect(req['url']).toBe('/api/recipes');
    const headers = req['headers'] as Record<string, unknown>;
    expect(headers['authorization']).toBe('[Redacted]');
    expect(headers['cookie']).toBe('[Redacted]');
    const raw = JSON.stringify(entries);
    expect(raw).not.toContain('bearer-secret');
    expect(raw).not.toContain('cookie-secret');
    expect(raw).not.toContain('share-secret');
  });

  test('excludes /api/health from access logs', async () => {
    const {app, lines} = buildApp();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    const entries = await lines();
    expect(entries).toEqual([]);
  });
});

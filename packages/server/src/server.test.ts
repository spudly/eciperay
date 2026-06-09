import request from 'supertest';

import {createApp} from './server.js';

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
});

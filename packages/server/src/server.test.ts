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

  test('returns 404 for unknown routes', async () => {
    const app = createApp();
    const res = await request(app).get('/does-not-exist');
    expect(res.status).toBe(404);
  });
});

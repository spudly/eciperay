import express from 'express';
import request from 'supertest';

import {createMockQuery} from '../../test/mockQuery.js';

import {attachSsrRoutes} from './attachSsrRoutes.js';

const mockQuery = createMockQuery();

describe('attachSsrRoutes gate', () => {
  test('attaches nothing when SSR_PUBLIC_RECIPE is unset and no renderer is injected', async () => {
    const app = express();
    attachSsrRoutes(app, mockQuery);
    app.use((_req, res) => {
      res.status(200).type('text/html').send('<html>SPA fallback</html>');
    });

    const res = await request(app).get('/recipe/recipe-uuid-1/pasta');

    expect(res.status).toBe(200);
    expect(res.text).toContain('SPA fallback');
  });
});

import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

import express from 'express';
import request from 'supertest';

import {
  attachWebStatic,
  isWebDistAvailable,
  WEB_DIST_DIR,
} from './staticWeb.js';

const makeFixtureDist = (): string => {
  const dir = mkdtempSync(path.join(tmpdir(), 'eciperay-web-dist-'));
  writeFileSync(
    path.join(dir, 'index.html'),
    '<!DOCTYPE html><html><body>spa</body></html>',
  );
  writeFileSync(path.join(dir, 'app.js'), 'console.log("bundle");');
  mkdirSync(path.join(dir, 'assets'), {recursive: true});
  writeFileSync(path.join(dir, 'assets', 'logo.svg'), '<svg></svg>');
  return dir;
};

describe('attachWebStatic', () => {
  test('serves built assets and SPA fallback for client routes', async () => {
    const distDir = makeFixtureDist();
    const app = express();
    attachWebStatic(app, distDir);

    const asset = await request(app).get('/app.js');
    expect(asset.status).toBe(200);
    expect(asset.text).toContain('bundle');

    const spa = await request(app).get('/recipes');
    expect(spa.status).toBe(200);
    expect(spa.text).toContain('spa');

    const root = await request(app).get('/');
    expect(root.status).toBe(200);
    expect(root.text).toContain('spa');
  });

  test('serves the consent page with its noindex directive in the initial HTML', async () => {
    const distDir = mkdtempSync(path.join(tmpdir(), 'eciperay-web-dist-'));
    writeFileSync(
      path.join(distDir, 'index.html'),
      '<!DOCTYPE html><html><head><title>Eciperay</title></head><body>spa</body></html>',
    );
    const app = express();
    attachWebStatic(app, distDir);

    const consent = await request(app).get('/privacy/consent');
    expect(consent.status).toBe(200);
    expect(consent.text).toContain(
      '<meta name="robots" content="noindex, nofollow" />',
    );

    const other = await request(app).get('/recipes');
    expect(other.status).toBe(200);
    expect(other.text).not.toContain('name="robots"');
  });

  test('does not serve SPA fallback for /api paths', async () => {
    const distDir = makeFixtureDist();
    const app = express();
    app.get('/api/health', (_req, res) => {
      res.json({status: 'ok'});
    });
    attachWebStatic(app, distDir);

    const api = await request(app).get('/api/health');
    expect(api.status).toBe(200);
    expect(api.body).toEqual({status: 'ok'});

    const missingApi = await request(app).get('/api/unknown');
    expect(missingApi.status).toBe(404);
  });

  test('serves SPA index for HEAD requests on client routes', async () => {
    const distDir = makeFixtureDist();
    const app = express();
    attachWebStatic(app, distDir);

    const res = await request(app).head('/recipes');
    expect(res.status).toBe(200);
  });

  test('does not serve SPA fallback for non-GET/HEAD methods', async () => {
    const distDir = makeFixtureDist();
    const app = express();
    attachWebStatic(app, distDir);

    const res = await request(app).post('/recipes');
    expect(res.status).toBe(404);
  });

  test('isWebDistAvailable reflects whether the default dist directory exists', () => {
    expect(isWebDistAvailable()).toBe(false);
    mkdirSync(WEB_DIST_DIR, {recursive: true});
    try {
      expect(isWebDistAvailable()).toBe(true);
    } finally {
      rmSync(WEB_DIST_DIR, {recursive: true, force: true});
    }
  });
});

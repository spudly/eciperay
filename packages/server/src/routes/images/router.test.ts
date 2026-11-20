import {jest} from '@jest/globals';
import express from 'express';
import request from 'supertest';

import type {ImageStorage} from '../../lib/imageResizer.js';

import {createImageResizerRouter} from './router.js';

const original = {buffer: Buffer.from('original-bytes'), contentType: 'image/jpeg'};
const resized = {buffer: Buffer.from('resized-bytes'), contentType: 'image/jpeg'};

const makeStorage = (overrides: Partial<ImageStorage> = {}): ImageStorage => ({
  download: async key =>
    key.endsWith('__w400') ? null : original,
  upload: async () => {},
  list: async () => [],
  remove: async () => {},
  ...overrides,
});

const makeApp = (storage: ImageStorage, resize = async () => resized) =>
  express().use('/api/images', createImageResizerRouter({storage, resize}));

describe('GET /api/images/resize', () => {
  test('cache hit serves variant without resizing or uploading', async () => {
    const resize = jest.fn(async () => resized);
    const upload = jest.fn(async () => {});
    const storage = makeStorage({
      download: async key =>
        key.endsWith('__w400')
          ? {buffer: Buffer.from('cached'), contentType: 'image/png'}
          : original,
      upload,
    });
    const res = await request(makeApp(storage, resize as never)).get(
      '/api/images/resize?path=user-1/recipe-1&w=400',
    );
    expect(res.status).toBe(200);
    expect(res.body.toString()).toBe('cached');
    expect(res.headers['cache-control']).toBe(
      'public, max-age=31536000, immutable',
    );
    expect(resize).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });

  test('cache miss resizes, streams, and uploads variant', async () => {
    const upload = jest.fn(async () => {});
    const storage = makeStorage({upload});
    const res = await request(makeApp(storage)).get(
      '/api/images/resize?path=user-1/recipe-1&w=400',
    );
    expect(res.status).toBe(200);
    expect(res.body.toString()).toBe('resized-bytes');
    expect(res.headers['cache-control']).toContain('immutable');
    expect(upload).toHaveBeenCalledWith(
      'user-1/recipe-1__w400',
      resized.buffer,
      'image/jpeg',
    );
  });

  test('invalid w is rejected', async () => {
    for (const w of ['0', '15', '1601', 'abc', '10.5', '']) {
      const res = await request(makeApp(makeStorage())).get(
        `/api/images/resize?path=user-1/recipe-1&w=${w}`,
      );
      expect(res.status).toBe(400);
    }
    const missing = await request(makeApp(makeStorage())).get(
      '/api/images/resize?path=user-1/recipe-1',
    );
    expect(missing.status).toBe(400);
  });

  test('invalid path is rejected', async () => {
    const res = await request(makeApp(makeStorage())).get(
      '/api/images/resize?path=../secret&w=400',
    );
    expect(res.status).toBe(400);
  });

  test('resize failure falls back to original bytes', async () => {
    const storage = makeStorage();
    const resize = async () => {
      throw new Error('sharp failed');
    };
    const res = await request(makeApp(storage, resize)).get(
      '/api/images/resize?path=user-1/recipe-1&w=400',
    );
    expect(res.status).toBe(200);
    expect(res.body.toString()).toBe('original-bytes');
    expect(res.headers['cache-control']).toContain('immutable');
  });

  test('upload failure on miss is not fatal', async () => {
    const storage = makeStorage({
      upload: async () => {
        throw new Error('upload failed');
      },
    });
    const res = await request(makeApp(storage)).get(
      '/api/images/resize?path=user-1/recipe-1&w=400',
    );
    expect(res.status).toBe(200);
    expect(res.body.toString()).toBe('resized-bytes');
  });

  test('missing original returns 404', async () => {
    const storage = makeStorage({download: async () => null});
    const res = await request(makeApp(storage)).get(
      '/api/images/resize?path=user-1/nope&w=400',
    );
    expect(res.status).toBe(404);
  });

  test('download failure of original returns 404, variant download failure still resizes', async () => {
    const throwing = makeStorage({
      download: async key => {
        if (key.endsWith('__w400')) throw new Error('cache down');
        return original;
      },
    });
    const res = await request(makeApp(throwing)).get(
      '/api/images/resize?path=user-1/recipe-1&w=400',
    );
    expect(res.status).toBe(200);
    expect(res.body.toString()).toBe('resized-bytes');

    const failing = makeStorage({
      download: async () => {
        throw new Error('storage down');
      },
    });
    const res2 = await request(makeApp(failing)).get(
      '/api/images/resize?path=user-1/recipe-1&w=400',
    );
    // variant throw is swallowed, original throw -> null -> 404
    expect(res2.status).toBe(404);
  });
});

import {beforeAll} from '@jest/globals';
import type {Express} from 'express';

import type {query} from '../db/query.js';

type QueryFn = typeof query;

type LazyTestAppOptions = {query?: QueryFn; serveWeb?: boolean};

/**
 * Defers `createApp()` until `beforeAll` so route modules load after Jest
 * mocks.
 */
export const lazyTestApp = (
  options: LazyTestAppOptions = {},
): (() => Express) => {
  let app: Express;
  beforeAll(async () => {
    const {createApp} = await import('../server.js');
    app = createApp(options);
  });
  return () => app;
};

import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {afterEach} from '@jest/globals';
import {config} from 'dotenv';
import nock from 'nock';

// Load root .env so SUPABASE_URL and other vars are available for tests.
// override:true ensures real values from .env take precedence over the
// placeholder fallbacks set in jest.setupEnv.js (which runs before this file).
config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env'),
  override: true,
  quiet: true,
});

// Block all real HTTP connections to external services.
// Supertest's loopback connections (127.0.0.1) pass through automatically.
nock.disableNetConnect();
nock.enableNetConnect(/127\.0\.0\.1|localhost/u);

// resetMocks: true in jest.config.cjs handles jest.resetAllMocks() automatically.
afterEach(() => {
  nock.cleanAll();
});

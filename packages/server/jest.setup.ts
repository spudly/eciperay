import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {afterEach} from '@jest/globals';
import {config} from 'dotenv';
import nock from 'nock';

// Load root .env so SUPABASE_URL and other vars are available when modules
// like supabase.ts initialise at import time.
// jest.setup.ts is at packages/server/ — two levels up reaches the repo root
config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env'),
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

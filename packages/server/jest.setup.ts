import {createRequire} from 'node:module';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {afterAll, afterEach} from '@jest/globals';
import {config} from 'dotenv';
import nock from 'nock';

import {shutdownPostHog} from './src/lib/posthog.js';
import {shutdownPostHogLogs} from './src/lib/posthogLogs.js';

const require = createRequire(import.meta.url);
const {
  installFailOnConsoleError,
} = require('../../test/failOnConsoleError.cjs');

// Load root .env so SUPABASE_URL and other vars are available for tests.
// override:true ensures real values from .env take precedence over the
// placeholder fallbacks set in jest.setupEnv.js (which runs before this file).
const nodeEnv = process.env['NODE_ENV'];
config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env'),
  override: true,
  quiet: true,
});
// Keep Jest's test environment after dotenv override (e.g. NODE_ENV=development in .env).
process.env['NODE_ENV'] = nodeEnv ?? 'test';
// PostHog must be opt-in per test; otherwise createApp() leaves flush timers running.
process.env['POSTHOG_KEY'] = '';

installFailOnConsoleError();

const mockPostHogNetwork = () => {
  nock('https://us.i.posthog.com')
    .post(/\/batch\/?/)
    .reply(200, {status: 1});
  nock('https://us.i.posthog.com').post('/i/v1/logs').reply(200, {});
};

// Block all real HTTP connections to external services.
// Supertest's loopback connections (127.0.0.1) pass through automatically.
nock.disableNetConnect();
nock.enableNetConnect(/127\.0\.0\.1|localhost/u);

// resetMocks: true in jest.config.cjs handles jest.resetAllMocks() automatically.
afterEach(() => {
  nock.cleanAll();
});

afterAll(async () => {
  mockPostHogNetwork();
  await shutdownPostHog();
  await shutdownPostHogLogs();
});

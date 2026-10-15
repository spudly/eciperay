import '@testing-library/jest-dom/vitest';
import {createRequire} from 'node:module';

import {notifyManager} from '@tanstack/react-query';
import {cleanup} from '@testing-library/react';
import {afterAll, afterEach, beforeAll, vi} from 'vitest';

import {server} from './msw/server.js';

const require = createRequire(import.meta.url);
const {formatConsoleArgs} = require('../../../../test/failOnConsoleError.cjs');

notifyManager.setScheduler(queueMicrotask);

// --- jsdom polyfills for Tamagui ---
// jsdom lacks Web Animations (Element.animate, used by Tamagui Spinner) and
// ResizeObserver (used by Tamagui Tabs). Minimal no-op stubs so components
// render in tests; visual behavior is unaffected in real browsers.
/* eslint-disable @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-unnecessary-type-assertion, unicorn/no-typeof-undefined -- jsdom lacks these APIs; the checks are for real browsers */
if (typeof Element !== 'undefined' && !Element.prototype.animate) {
  Element.prototype.animate = (() =>
    ({
      finished: Promise.resolve(),
      cancel() {},
      play() {},
      pause() {},
    }) as unknown as Animation) as typeof Element.prototype.animate;
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver;
}
/* eslint-enable @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-unnecessary-type-assertion, unicorn/no-typeof-undefined -- re-enable after polyfills */

// --- fail-on-console-error (filtered) ---

// Tamagui injects a <style> tag with CSS custom properties that jsdom's CSS
// parser cannot handle ("Could not parse CSS stylesheet"). The CSS is valid;
// this is a jsdom limitation, not an application error. We install a local
// fail-on-console-error guard that filters that specific noise, instead of
// the shared helper, so the protection stays intact for real errors.
// eslint-disable-next-line no-console -- capture original for test guard
const realConsoleError = console.error.bind(console);
/** @type {unknown[][]} */
const consoleErrors: unknown[][] = [];

beforeEach(() => {
  consoleErrors.length = 0;
  // eslint-disable-next-line no-console -- test setup must intercept console.error
  console.error = (...args) => {
    const text = args
      .map(arg => (arg instanceof Error ? arg.message : String(arg)))
      .join(' ');
    if (text.includes('Could not parse CSS stylesheet')) {
      return;
    }
    // Tamagui's StarRatingInput, ColorPickerField, ToggleChipGroup, and Button
    // pass React Native-style accessibility props, which React warns
    // about on DOM elements in the jsdom test environment. This is a known
    // design-system prop-mapping quirk, not an application error. Narrowly
    // scoped to the exact React "does not recognize" warning for the four
    // RN-style accessibility props the DS passes through — warnings for any
    // other props remain visible and will fail tests.
    // Note: React logs these with %s placeholders, so the prop name appears
    // as a separate arg; we check the joined text for both parts.
    if (
      text.includes('React does not recognize') &&
      text.includes('prop on a DOM element') &&
      (text.includes('accessibilityRole') ||
        text.includes('accessibilityLabel') ||
        text.includes('accessibilityState') ||
        text.includes('accessibilityValue'))
    ) {
      return;
    }
    consoleErrors.push(args);
    realConsoleError(...args);
  };
});

afterEach(() => {
  // eslint-disable-next-line no-console -- restore original console.error after test
  console.error = realConsoleError;
  if (consoleErrors.length === 0) {
    return;
  }
  const testName = expect.getState().currentTestName ?? '(unknown test)';
  const details = consoleErrors
    .map((args, index) => `  [${index + 1}] ${formatConsoleArgs(args)}`)
    .join('\n');
  throw new Error(`console.error was called during "${testName}":\n${details}`);
});

URL.createObjectURL = vi.fn(() => 'blob:preview');
URL.revokeObjectURL = vi.fn();

vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080/api');
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

const mockSession = {
  access_token: 'test-token',
  user: {id: 'user-1', email: 'test@example.com'},
};

const mockAuth = {
  getSession: vi.fn().mockResolvedValue({data: {session: mockSession}}),
  signInWithPassword: vi.fn().mockResolvedValue({error: null}),
  signUp: vi
    .fn()
    .mockResolvedValue({data: {session: mockSession}, error: null}),
  signOut: vi.fn().mockResolvedValue({error: null}),
  resetPasswordForEmail: vi.fn().mockResolvedValue({error: null}),
  updateUser: vi.fn().mockResolvedValue({error: null}),
  onAuthStateChange: vi
    .fn()
    .mockReturnValue({data: {subscription: {unsubscribe: vi.fn()}}}),
};

vi.mock('../lib/supabase.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../lib/supabase.js')>();
  return {...actual, supabase: {auth: mockAuth}};
});

beforeAll(() => {
  server.listen({onUnhandledFrame: 'error'});
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

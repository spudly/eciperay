/**
 * Conversion tests for the E2E_FIXTURE_MODE flag in lib/env (#183
 * Phase 2): only the exact string 'true' — baked solely by the Android
 * emulator CI job — enables fixture mode. Everything else (unset,
 * empty, 'false') must keep the app on the real clients.
 */

const mockEnv: {
  API_BASE_URL: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  POSTHOG_KEY: string;
  POSTHOG_HOST: string;
  E2E_FIXTURE_MODE: string | undefined;
} = {
  API_BASE_URL: 'http://localhost:8080/api',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  POSTHOG_KEY: '',
  POSTHOG_HOST: '',
  E2E_FIXTURE_MODE: undefined,
};

jest.mock('@env', () => mockEnv);

const loadFlag = (): boolean => {
  jest.resetModules();
  return (require('./env') as typeof import('./env')).E2E_FIXTURE_MODE;
};

describe('E2E_FIXTURE_MODE conversion', () => {
  it('is false when the var is unset', () => {
    mockEnv.E2E_FIXTURE_MODE = undefined;
    expect(loadFlag()).toBe(false);
  });

  it('is false when the var is empty', () => {
    mockEnv.E2E_FIXTURE_MODE = '';
    expect(loadFlag()).toBe(false);
  });

  it("is false when the var is 'false'", () => {
    mockEnv.E2E_FIXTURE_MODE = 'false';
    expect(loadFlag()).toBe(false);
  });

  it("is true only for the exact string 'true'", () => {
    mockEnv.E2E_FIXTURE_MODE = 'true';
    expect(loadFlag()).toBe(true);
  });
});

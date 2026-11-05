import {describe, expect, it} from '@jest/globals';

import {formatGithubOutput, selectE2eSpecs} from './selectE2eSpecs.ts';

describe('selectE2eSpecs', () => {
  it('selects only the live auth specs and mocked signed-out for an auth diff', () => {
    const result = selectE2eSpecs([
      'packages/web/src/pages/auth/ForgotPasswordPage.tsx',
    ]);
    expect(result.live).toEqual([
      'e2e-live/auth.spec.ts',
      'e2e-live/sign-out.spec.ts',
    ]);
    expect(result.mocked).toEqual(['e2e/signed-out.spec.ts']);
  });

  it('selects the recipes specs for a recipe diff', () => {
    const result = selectE2eSpecs([
      'packages/web/src/pages/recipes/RecipeDetail.tsx',
      'packages/server/src/routes/recipes.ts',
    ]);
    expect(result.mocked).toContain('e2e/recipes.spec.ts');
    expect(result.live).toEqual(['e2e-live/recipes.spec.ts']);
  });

  it('fails open to both full suites for an unmapped web file', () => {
    const result = selectE2eSpecs(['packages/web/src/lib/someNewModule.ts']);
    expect(result.mocked).toBe('all');
    expect(result.live).toBe('all');
  });

  it('fails open for an unmapped server file', () => {
    const result = selectE2eSpecs(['packages/server/src/lib/newThing.ts']);
    expect(result.mocked).toBe('all');
    expect(result.live).toBe('all');
  });

  it('selects a suite in full when one of its own files changes', () => {
    expect(selectE2eSpecs(['packages/web/e2e/fixtures.ts']).mocked).toBe('all');
    expect(selectE2eSpecs(['packages/web/e2e-live/qa.ts']).live).toBe('all');
    expect(
      selectE2eSpecs(['packages/web/e2e-live/auth.spec.ts']).mocked,
    ).toEqual([]);
  });

  it('selects nothing for a docs-only diff', () => {
    const result = selectE2eSpecs([
      'docs/manual-tests.md',
      'packages/web/e2e-live/README.md',
    ]);
    // The README lives in the live suite dir but is documentation; the
    // markdown rule wins so doc edits never trigger a suite run.
    expect(result.mocked).toEqual([]);
    expect(result.live).toEqual([]);
  });

  it('selects nothing for files outside the e2e-relevant trees', () => {
    const result = selectE2eSpecs([
      'packages/app/src/screens/Home.tsx',
      '.github/workflows/ci.yml',
    ]);
    expect(result.mocked).toEqual([]);
    expect(result.live).toEqual([]);
  });

  it('selects both suites in full for shared plumbing', () => {
    for (const file of [
      'package-lock.json',
      'packages/web/src/main.tsx',
      'packages/web/src/routes/index.tsx',
      'packages/web/playwright.live.config.ts',
    ]) {
      const result = selectE2eSpecs([file]);
      expect(result.mocked).toBe('all');
      expect(result.live).toBe('all');
    }
  });

  it('ignores unit test files', () => {
    const result = selectE2eSpecs([
      'packages/web/src/pages/auth/LoginPage.test.tsx',
    ]);
    expect(result.mocked).toEqual([]);
    expect(result.live).toEqual([]);
  });
});

describe('formatGithubOutput', () => {
  it('emits run=true with empty specs for a full suite', () => {
    const out = formatGithubOutput({mocked: 'all', live: []});
    expect(out).toContain('mocked-specs=\nmocked-run=true');
    expect(out).toContain('live-specs=\nlive-run=false');
  });

  it('emits the spec args for a scoped selection', () => {
    const out = formatGithubOutput({
      mocked: ['e2e/recipes.spec.ts'],
      live: ['e2e-live/recipes.spec.ts'],
    });
    expect(out).toContain('mocked-specs=e2e/recipes.spec.ts');
    expect(out).toContain('live-specs=e2e-live/recipes.spec.ts');
    expect(out).toContain('mocked-run=true');
    expect(out).toContain('live-run=true');
  });
});

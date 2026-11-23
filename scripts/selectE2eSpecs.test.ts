import {describe, expect, it, jest} from '@jest/globals';

import {
  formatGithubOutput,
  isDirectRun,
  maybeRunSelectE2eSpecsCli,
  runSelectE2eSpecsCli,
  selectE2eSpecs,
} from './selectE2eSpecs.ts';

describe('selectE2eSpecs', () => {
  it('selects only the live auth specs and mocked signed-out for an auth diff', () => {
    const result = selectE2eSpecs([
      'packages/web/src/pages/auth/ForgotPasswordPage.tsx',
    ]);
    expect(result.live).toEqual([
      'e2e-live/auth.spec.ts',
      'e2e-live/public.spec.ts',
      'e2e-live/sign-out.spec.ts',
    ]);
    expect(result.mocked).toEqual(['e2e/signed-out.spec.ts']);
  });

  it('selects the public live spec for a login page change', () => {
    // The wrong-password rejection check lives in the live public spec, so
    // an auth-page change must select it, not just the auth/sign-out specs.
    const result = selectE2eSpecs([
      'packages/web/src/pages/auth/LoginPage.tsx',
    ]);
    expect(result.live).toContain('e2e-live/public.spec.ts');
  });

  it('selects the signed-out specs for a Recipes page change', () => {
    const result = selectE2eSpecs(['packages/web/src/pages/RecipesPage.tsx']);
    expect(result.mocked).toContain('e2e/signed-out.spec.ts');
    expect(result.live).toContain('e2e-live/public.spec.ts');
    // The recipes mapping for the unified page applies too (#622).
    expect(result.mocked).toContain('e2e/recipes.spec.ts');
    expect(result.live).toContain('e2e-live/recipes.spec.ts');
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

  it('runs both suites in full for shared root configuration, even with a mapped change', () => {
    for (const file of [
      'tsconfig.base.json',
      'turbo.json',
      'patches/x.patch',
    ]) {
      const result = selectE2eSpecs([
        file,
        'packages/web/src/pages/recipes/RecipeDetail.tsx',
      ]);
      expect(result.mocked).toBe('all');
      expect(result.live).toBe('all');
    }
  });

  it('fails open when a rename moves an unmapped web file out of the web tree', () => {
    // getChangedFiles passes --no-renames, so a move out of packages/web
    // arrives as the web source path plus the destination; the unmapped
    // web source must fail open even alongside a mapped change.
    const result = selectE2eSpecs([
      'packages/web/src/lib/moved.ts',
      'packages/app/src/lib/moved.ts',
      'packages/web/src/pages/recipes/RecipeDetail.tsx',
    ]);
    expect(result.mocked).toBe('all');
    expect(result.live).toBe('all');
  });

  it('ignores unit test files', () => {
    const result = selectE2eSpecs([
      'packages/web/src/pages/auth/LoginPage.test.tsx',
    ]);
    expect(result.mocked).toEqual([]);
    expect(result.live).toEqual([]);
  });
});

describe('runSelectE2eSpecsCli', () => {
  it('writes full-suite output for manual and scheduled events', () => {
    const originalGithubOutput = process.env['GITHUB_OUTPUT'];
    delete process.env['GITHUB_OUTPUT'];
    const stdoutSpy = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    try {
      for (const eventName of ['workflow_dispatch', 'schedule']) {
        stdoutSpy.mockClear();
        runSelectE2eSpecsCli({execSync: jest.fn()}, ['node', 'script'], {
          GITHUB_EVENT_NAME: eventName,
        });
        const output = stdoutSpy.mock.calls
          .map(call => String(call[0]))
          .join('');
        expect(output).toContain('mocked-specs=\nmocked-run=true');
        expect(output).toContain('live-specs=\nlive-run=true');
      }
    } finally {
      stdoutSpy.mockRestore();
      if (originalGithubOutput === undefined) {
        delete process.env['GITHUB_OUTPUT'];
      } else {
        process.env['GITHUB_OUTPUT'] = originalGithubOutput;
      }
    }
  });
});

describe('runSelectE2eSpecsCli with a base ref', () => {
  it('selects specs from the changed files reported by git diff', () => {
    const originalGithubOutput = process.env['GITHUB_OUTPUT'];
    delete process.env['GITHUB_OUTPUT'];
    const stdoutSpy = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    const execSync = jest
      .fn()
      .mockReturnValue('packages/web/src/pages/auth/LoginPage.tsx\0');
    try {
      runSelectE2eSpecsCli(
        {execSync},
        ['node', 'script', '--base', 'origin/master'],
        {},
      );
      const output = stdoutSpy.mock.calls.map(call => String(call[0])).join('');
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('origin/master..HEAD'),
        expect.anything(),
      );
      expect(output).toContain('mocked-specs=e2e/signed-out.spec.ts');
      expect(output).toContain(
        'live-specs=e2e-live/auth.spec.ts e2e-live/public.spec.ts e2e-live/sign-out.spec.ts',
      );
    } finally {
      stdoutSpy.mockRestore();
      if (originalGithubOutput === undefined) {
        delete process.env['GITHUB_OUTPUT'];
      } else {
        process.env['GITHUB_OUTPUT'] = originalGithubOutput;
      }
    }
  });
});

describe('isDirectRun', () => {
  it('returns false without an argv entry', () => {
    expect(isDirectRun([], '/module.ts')).toBe(false);
    expect(isDirectRun(['node'], '/module.ts')).toBe(false);
  });

  it('returns false when argv names another module', () => {
    expect(isDirectRun(['node', '/other.ts'], '/module.ts')).toBe(false);
  });

  it('returns true when argv matches the module path', () => {
    expect(isDirectRun(['node', '/module.ts'], '/module.ts')).toBe(true);
  });
});

describe('maybeRunSelectE2eSpecsCli', () => {
  it('runs the cli when invoked directly', () => {
    const run = jest.fn();
    maybeRunSelectE2eSpecsCli(true, run);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('skips the cli when imported', () => {
    const run = jest.fn();
    maybeRunSelectE2eSpecsCli(false, run);
    expect(run).not.toHaveBeenCalled();
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

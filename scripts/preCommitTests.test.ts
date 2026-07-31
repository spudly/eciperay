import {
  affectedCoveragePackages,
  findMissingColocatedTests,
  requiresColocatedTest,
} from './preCommitTestRules.ts';
import {
  assertNewSourceHasColocatedTests,
  childProcessDepsFactory,
  createDefaultChildProcessDeps,
  getStagedAddedFiles,
  getStagedFiles,
  isDirectRun,
  main,
  runPackageCoverage,
  runPreCommitTestsCli,
  maybeRunPreCommitTestsCli,
} from './preCommitTests.ts';

const root = new URL('..', import.meta.url).pathname;

describe('findMissingColocatedTests', () => {
  it('requires a colocated test for new app screens', () => {
    const failures = findMissingColocatedTests(
      root,
      ['packages/app/src/screens/NewExampleScreen.tsx'],
      ['packages/app/src/screens/NewExampleScreen.tsx'],
    );
    expect(failures).toEqual([
      'packages/app/src/screens/NewExampleScreen.tsx (expected packages/app/src/screens/NewExampleScreen.test.ts or packages/app/src/screens/NewExampleScreen.test.tsx)',
    ]);
  });

  it('passes when the colocated test is staged', () => {
    const failures = findMissingColocatedTests(
      root,
      ['packages/app/src/screens/NewExampleScreen.tsx'],
      [
        'packages/app/src/screens/NewExampleScreen.tsx',
        'packages/app/src/screens/NewExampleScreen.test.tsx',
      ],
    );
    expect(failures).toEqual([]);
  });

  it('does not require colocated tests for new app components', () => {
    expect(
      requiresColocatedTest('packages/app/src/components/NewExample.tsx'),
    ).toBe(false);
    const failures = findMissingColocatedTests(
      root,
      ['packages/app/src/components/NewExample.tsx'],
      ['packages/app/src/components/NewExample.tsx'],
    );
    expect(failures).toEqual([]);
  });

  it('does not require colocated tests for new web pages', () => {
    const failures = findMissingColocatedTests(
      root,
      ['packages/web/src/pages/PrivacyPolicyPage.tsx'],
      ['packages/web/src/pages/PrivacyPolicyPage.tsx'],
    );
    expect(failures).toEqual([]);
  });

  it('requires colocated tests for new web lib modules', () => {
    const failures = findMissingColocatedTests(
      root,
      ['packages/web/src/lib/newExportHelper.ts'],
      ['packages/web/src/lib/newExportHelper.ts'],
    );
    expect(failures).toEqual([
      'packages/web/src/lib/newExportHelper.ts (expected packages/web/src/lib/newExportHelper.test.ts or packages/web/src/lib/newExportHelper.test.tsx)',
    ]);
  });

  it('skips files excluded from package coverage config', () => {
    const failures = findMissingColocatedTests(
      root,
      ['packages/client/src/index.ts'],
      ['packages/client/src/index.ts'],
    );
    expect(failures).toEqual([]);
  });
});

describe('affectedCoveragePackages', () => {
  it('returns packages with staged src changes only', () => {
    expect(
      affectedCoveragePackages([
        'packages/app/src/screens/ProfileScreen.tsx',
        'README.md',
        'packages/web/src/pages/auth/LoginPage.test.tsx',
      ]),
    ).toEqual(['app']);
  });

  it('returns multiple packages when needed', () => {
    expect(
      affectedCoveragePackages([
        'packages/app/src/screens/ProfileScreen.tsx',
        'packages/client/src/legalUrls.ts',
      ]),
    ).toEqual(['app', 'client']);
  });
});

describe('preCommitTests', () => {
  it('parses staged files from git output', () => {
    const execSync = jest.fn().mockReturnValue('packages/app/src/foo.ts\n');
    expect(getStagedFiles('/repo', execSync)).toEqual([
      'packages/app/src/foo.ts',
    ]);
  });

  it('returns empty staged files when git output is blank', () => {
    const execSync = jest.fn().mockReturnValue('');
    expect(getStagedFiles('/repo', execSync)).toEqual([]);
  });

  it('parses staged added files from git output', () => {
    const execSync = jest.fn().mockReturnValue('packages/app/src/new.ts');
    expect(getStagedAddedFiles('/repo', execSync)).toEqual([
      'packages/app/src/new.ts',
    ]);
  });

  it('exits when colocated tests are missing', () => {
    const stderrSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const exit = jest.fn() as (code: number) => never;
    assertNewSourceHasColocatedTests(
      root,
      ['packages/app/src/screens/MissingTestScreen.tsx'],
      ['packages/app/src/screens/MissingTestScreen.tsx'],
      exit,
    );
    expect(exit).toHaveBeenCalledWith(1);
    stderrSpy.mockRestore();
  });

  it('uses process.exit by default when colocated tests are missing', () => {
    const stderrSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((() => {}) as (code?: number) => never);
    assertNewSourceHasColocatedTests(
      root,
      ['packages/app/src/screens/MissingTestScreen.tsx'],
      ['packages/app/src/screens/MissingTestScreen.tsx'],
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  it('skips coverage when no packages are affected', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    runPackageCoverage('/repo', [], jest.fn());
    expect(logSpy).toHaveBeenCalledWith(
      'pre-commit: no src/ changes in test packages, skipping coverage',
    );
    logSpy.mockRestore();
  });

  it('exits when turbo coverage fails', () => {
    const exit = jest.fn() as (code: number) => never;
    const spawnSync = jest.fn().mockReturnValue({status: 2});
    runPackageCoverage('/repo', ['client'], spawnSync, exit);
    expect(exit).toHaveBeenCalledWith(2);
  });

  it('uses process.exit by default when turbo coverage fails', () => {
    const exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((() => {}) as (code?: number) => never);
    const spawnSync = jest.fn().mockReturnValue({status: null});
    runPackageCoverage('/repo', ['client'], spawnSync);
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('succeeds when turbo coverage passes', () => {
    const spawnSync = jest.fn().mockReturnValue({status: 0});
    expect(() => {
      runPackageCoverage('/repo', ['client'], spawnSync);
    }).not.toThrow();
  });

  it('returns early when nothing is staged', () => {
    const execSync = jest.fn().mockReturnValue('');
    const spawnSync = jest.fn();
    main('/repo', {execSync, spawnSync});
    expect(spawnSync).not.toHaveBeenCalled();
  });

  it('runs package coverage for staged changes', () => {
    const execSync = jest
      .fn()
      .mockReturnValueOnce('packages/client/src/foo.ts')
      .mockReturnValueOnce('');
    const spawnSync = jest.fn().mockReturnValue({status: 0});
    main('/repo', {execSync, spawnSync});
    expect(spawnSync).toHaveBeenCalled();
  });

  it('uses process.exit by default in main when validation fails', () => {
    const stderrSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    const execSync = jest
      .fn()
      .mockReturnValueOnce('packages/app/src/screens/MissingTestScreen.tsx')
      .mockReturnValueOnce('packages/app/src/screens/MissingTestScreen.tsx');
    expect(() => {
      main('/repo', {execSync, spawnSync: jest.fn()});
    }).toThrow('exit');
    exitSpy.mockRestore();
    stderrSpy.mockRestore();
  });
});

describe('isDirectRun', () => {
  it('detects direct execution from argv', () => {
    expect(
      isDirectRun(
        ['node', '/repo/scripts/preCommitTests.ts'],
        '/repo/scripts/preCommitTests.ts',
      ),
    ).toBe(true);
    expect(isDirectRun([], '/repo/scripts/preCommitTests.ts')).toBe(false);
  });
});

describe('runPreCommitTestsCli', () => {
  it('invokes main with injected deps', () => {
    const execSync = jest.fn().mockReturnValue('');
    const spawnSync = jest.fn();
    runPreCommitTestsCli('/repo', {execSync, spawnSync});
    expect(execSync).toHaveBeenCalled();
    expect(spawnSync).not.toHaveBeenCalled();
  });

  it('createDefaultChildProcessDeps returns child_process bindings', async () => {
    const childProcess = await import('node:child_process');
    expect(createDefaultChildProcessDeps()).toEqual({
      execSync: childProcess.execSync,
      spawnSync: childProcess.spawnSync,
    });
  });

  it('runPreCommitTestsCli without deps uses childProcessDepsFactory', () => {
    const execSync = jest.fn().mockReturnValue('');
    const spawnSync = jest.fn();
    const original = childProcessDepsFactory.create;
    childProcessDepsFactory.create = () => ({execSync, spawnSync});
    try {
      runPreCommitTestsCli('/repo');
      expect(execSync).toHaveBeenCalled();
      expect(spawnSync).not.toHaveBeenCalled();
    } finally {
      childProcessDepsFactory.create = original;
    }
  });
});

describe('maybeRunPreCommitTestsCli', () => {
  it('skips cli when not a direct run', () => {
    expect(() => {
      maybeRunPreCommitTestsCli(false);
    }).not.toThrow();
  });

  it('runs cli when direct run is true', () => {
    const run = jest.fn();
    maybeRunPreCommitTestsCli(true, run);
    expect(run).toHaveBeenCalled();
  });
});

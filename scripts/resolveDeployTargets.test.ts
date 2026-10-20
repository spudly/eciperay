import {
  expandAffectedPackages,
  formatGithubOutput,
  packagesToDeployTargets,
  parseCommitScopes,
  pathToPackage,
  resolveDeployTargetsFromPaths,
  resolveDeployTargetsFromSubjects,
  scopeToPackage,
  writeGithubOutput,
} from './resolveDeployTargets.ts';
import {
  getReleaseChangedPaths,
  isDirectRun,
  isTagRangeArgv,
  maybeRunResolveDeployTargetsCli,
  resolveDeployTargetsFromTags,
  runResolveDeployTargetsCli,
} from './resolveDeployTargetsCli.ts';

// One commit record in `git log --name-only --pretty=format:%x1e%s` output.
const logRecord = (subject: string, ...paths: string[]): string =>
  `\x1e${subject}\n${paths.map(path => `\n${path}`).join('')}\n`;

describe('parseCommitScopes', () => {
  test('parses a single scope', () => {
    expect(parseCommitScopes('feat(web): add page')).toEqual(['web']);
  });

  test('parses multiple scopes', () => {
    expect(parseCommitScopes('feat(web,client): add shared hook')).toEqual([
      'web',
      'client',
    ]);
  });

  test('returns empty array when scope is missing', () => {
    expect(parseCommitScopes('feat: no scope')).toEqual([]);
  });
});

describe('scopeToPackage', () => {
  test('maps android to app', () => {
    expect(scopeToPackage('android')).toBe('app');
  });

  test('returns null for non-package scopes', () => {
    expect(scopeToPackage('deps')).toBeNull();
  });
});

describe('expandAffectedPackages', () => {
  test('expands types to all consumers', () => {
    expect([...expandAffectedPackages(['types'])]).toEqual(
      expect.arrayContaining(['types', 'client', 'server', 'web', 'app']),
    );
  });

  test('skips packages already in the affected set', () => {
    expect([...expandAffectedPackages(['types', 'client'])]).toEqual(
      expect.arrayContaining(['types', 'client', 'server', 'web', 'app']),
    );
  });

  test('skips falsy package entries', () => {
    expect([
      ...expandAffectedPackages([undefined as unknown as 'web', 'web']),
    ]).toEqual(['web']);
  });
});

describe('packagesToDeployTargets', () => {
  test('maps web to fly only', () => {
    expect(packagesToDeployTargets(['web'])).toEqual({
      fly: true,
      android: false,
    });
  });

  test('maps app to android only', () => {
    expect(packagesToDeployTargets(['app'])).toEqual({
      fly: false,
      android: true,
    });
  });

  test('maps client to fly and android', () => {
    expect(packagesToDeployTargets(['client'])).toEqual({
      fly: true,
      android: true,
    });
  });
});

describe('resolveDeployTargetsFromSubjects', () => {
  test('deploys fly only for web changes', () => {
    expect(resolveDeployTargetsFromSubjects(['feat(web): add page'])).toEqual({
      fly: true,
      android: false,
    });
  });

  test('deploys fly and android for client changes', () => {
    expect(
      resolveDeployTargetsFromSubjects(['feat(client): add auth helper']),
    ).toEqual({fly: true, android: true});
  });

  test('deploys fly and android for types changes', () => {
    expect(
      resolveDeployTargetsFromSubjects(['feat(types): add field']),
    ).toEqual({fly: true, android: true});
  });

  test('deploys fly and android for theme changes', () => {
    expect(
      resolveDeployTargetsFromSubjects(['feat(theme): tweak tokens']),
    ).toEqual({fly: true, android: true});
  });

  test('deploys fly only for server changes', () => {
    expect(
      resolveDeployTargetsFromSubjects(['fix(server): handle timeout']),
    ).toEqual({fly: true, android: false});
  });

  test('unions targets for multi-scope commits', () => {
    expect(
      resolveDeployTargetsFromSubjects(['feat(web,server): shared config']),
    ).toEqual({fly: true, android: false});
  });

  test('ignores automated release commits', () => {
    expect(
      resolveDeployTargetsFromSubjects([
        'chore(release): 1.0.0 [skip ci]',
        'feat(web): add page',
      ]),
    ).toEqual({fly: true, android: false});
  });

  test('returns false for non-deploy scopes', () => {
    expect(
      resolveDeployTargetsFromSubjects(['chore(ci): tweak workflow']),
    ).toEqual({fly: false, android: false});
  });
});

describe('formatGithubOutput', () => {
  test('formats deploy outputs', () => {
    expect(formatGithubOutput({fly: true, android: false})).toBe(
      'deploy_fly=true\ndeploy_android=false\n',
    );
  });
});

describe('writeGithubOutput', () => {
  test('writes to github output file when provided', () => {
    const append = jest.fn();
    writeGithubOutput({fly: true, android: true}, '/tmp/output', append);
    expect(append).toHaveBeenCalledWith(
      '/tmp/output',
      'deploy_fly=true\ndeploy_android=true\n',
    );
  });

  test('writes to stdout when github output is missing', () => {
    const stdoutSpy = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    writeGithubOutput({fly: false, android: true}, undefined, jest.fn());
    expect(stdoutSpy).toHaveBeenCalledWith(
      'deploy_fly=false\ndeploy_android=true\n',
    );
    stdoutSpy.mockRestore();
  });
});

describe('isDirectRun', () => {
  test('returns false without argv entry', () => {
    expect(isDirectRun([], '/module.ts')).toBe(false);
  });

  test('returns true when argv matches module path', () => {
    expect(isDirectRun(['node', '/module.ts'], '/module.ts')).toBe(true);
  });
});

describe('maybeRunResolveDeployTargetsCli', () => {
  test('runs cli when invoked directly', () => {
    const run = jest.fn();
    maybeRunResolveDeployTargetsCli(true, run);
    expect(run).toHaveBeenCalled();
  });

  test('skips cli when imported', () => {
    const run = jest.fn();
    maybeRunResolveDeployTargetsCli(false, run);
    expect(run).not.toHaveBeenCalled();
  });
});

describe('pathToPackage', () => {
  test('maps package paths to their package', () => {
    expect(pathToPackage('packages/app/src/App.tsx')).toBe('app');
    expect(pathToPackage('packages/icons/assets/logo.svg')).toBe('icons');
    expect(pathToPackage('packages/mcp-server/src/index.ts')).toBe(
      'mcp-server',
    );
  });

  test('returns null outside known packages', () => {
    expect(pathToPackage('package.json')).toBeNull();
    expect(pathToPackage('.github/workflows/release.yml')).toBeNull();
    expect(pathToPackage('packages/not-a-package/src/index.ts')).toBeNull();
  });
});

describe('resolveDeployTargetsFromPaths', () => {
  test('deploys fly only for web changes', () => {
    expect(
      resolveDeployTargetsFromPaths(['packages/web/src/Page.tsx']),
    ).toEqual({fly: true, android: false});
  });

  test('deploys fly only for server changes', () => {
    expect(
      resolveDeployTargetsFromPaths(['packages/server/src/index.ts']),
    ).toEqual({fly: true, android: false});
  });

  test('deploys android only for app changes', () => {
    expect(resolveDeployTargetsFromPaths(['packages/app/src/App.tsx'])).toEqual(
      {fly: false, android: true},
    );
  });

  test('expands shared packages to their dependents', () => {
    expect(
      resolveDeployTargetsFromPaths(['packages/types/src/api.ts']),
    ).toEqual({fly: true, android: true});
    expect(
      resolveDeployTargetsFromPaths(['packages/client/src/auth.ts']),
    ).toEqual({fly: true, android: true});
    expect(resolveDeployTargetsFromPaths(['packages/icons/logo.svg'])).toEqual({
      fly: true,
      android: true,
    });
    expect(
      resolveDeployTargetsFromPaths(['packages/mcp-server/src/index.ts']),
    ).toEqual({fly: true, android: false});
  });

  test('deploys both for changes outside packages', () => {
    expect(resolveDeployTargetsFromPaths(['package-lock.json'])).toEqual({
      fly: true,
      android: true,
    });
    expect(
      resolveDeployTargetsFromPaths(['.github/workflows/android-deploy.yml']),
    ).toEqual({fly: true, android: true});
    expect(
      resolveDeployTargetsFromPaths(['packages/new-package/src/index.ts']),
    ).toEqual({fly: true, android: true});
  });

  test('returns false when nothing changed', () => {
    expect(resolveDeployTargetsFromPaths([])).toEqual({
      fly: false,
      android: false,
    });
  });
});

describe('getReleaseChangedPaths', () => {
  test('collects changed files per commit from git log', () => {
    const exec = jest.fn(
      () =>
        logRecord('feat(web): add page', 'packages/web/src/Page.tsx') +
        logRecord('fix(server): timeout', 'packages/server/src/index.ts'),
    );
    expect(getReleaseChangedPaths('v1.0.0', 'v1.1.0', exec)).toEqual([
      'packages/web/src/Page.tsx',
      'packages/server/src/index.ts',
    ]);
    expect(exec).toHaveBeenCalledWith(
      'git log v1.0.0..v1.1.0 --name-only --no-renames --diff-merges=first-parent --pretty=format:%x1e%s',
      {encoding: 'utf8'},
    );
  });

  test('collects both sides of a cross-package move', () => {
    // With --no-renames, git reports a move as a deletion plus an
    // addition; both packages must see the change.
    const exec = jest.fn(() =>
      logRecord(
        'refactor(web): move share button out of the app',
        'packages/app/src/components/ShareButton.tsx',
        'packages/web/src/components/ShareButton.tsx',
      ),
    );
    expect(getReleaseChangedPaths('v1.0.0', 'v1.1.0', exec)).toEqual([
      'packages/app/src/components/ShareButton.tsx',
      'packages/web/src/components/ShareButton.tsx',
    ]);
    expect(resolveDeployTargetsFromTags('v1.0.0', 'v1.1.0', exec)).toEqual({
      fly: true,
      android: true,
    });
  });

  test('excludes the automated release commit version bumps', () => {
    const exec = jest.fn(
      () =>
        logRecord(
          'chore(release): 1.1.0 [skip ci]',
          'package.json',
          'package-lock.json',
          'packages/app/package.json',
          'packages/web/package.json',
        ) + logRecord('fix(server): timeout', 'packages/server/src/index.ts'),
    );
    expect(getReleaseChangedPaths('v1.0.0', 'v1.1.0', exec)).toEqual([
      'packages/server/src/index.ts',
    ]);
  });

  test('returns empty array when git log is empty', () => {
    const exec = jest.fn(() => '');
    expect(getReleaseChangedPaths('v1.0.0', 'v1.1.0', exec)).toEqual([]);
  });
});

describe('resolveDeployTargetsFromTags', () => {
  test('resolves deploy targets from changed files between tags', () => {
    const exec = jest.fn(() =>
      logRecord('feat(client): add helper', 'packages/client/src/auth.ts'),
    );
    expect(resolveDeployTargetsFromTags('v0.1.0', 'v0.2.0', exec)).toEqual({
      fly: true,
      android: true,
    });
  });

  test('deploys android when app files changed under scope-less subjects', () => {
    // Regression for #151: merge-commit subjects carry no app/client
    // scope, so the old subject-based resolver skipped the Android build
    // even though the release changed app code. The merge record below
    // lists files because the CLI passes --diff-merges=first-parent;
    // without it git log would emit no file list for the merge at all.
    const exec = jest.fn(
      () =>
        logRecord(
          'chore(release): 1.1.0 [skip ci]',
          'packages/app/package.json',
          'packages/web/package.json',
        ) +
        logRecord(
          'Merge pull request #132 from spudly/styling-migration',
          'packages/app/src/screens/HomeScreen.tsx',
        ),
    );
    expect(resolveDeployTargetsFromTags('v1.0.0', 'v1.1.0', exec)).toEqual({
      fly: false,
      android: true,
    });
  });

  test('deploys nothing when only release version bumps changed', () => {
    const exec = jest.fn(() =>
      logRecord(
        'chore(release): 1.1.0 [skip ci]',
        'packages/app/package.json',
        'packages/server/package.json',
      ),
    );
    expect(resolveDeployTargetsFromTags('v1.0.0', 'v1.1.0', exec)).toEqual({
      fly: false,
      android: false,
    });
  });

  test('deploys everything for a first release with no previous tag', () => {
    const exec = jest.fn(() => {
      throw new Error('git must not be called without a previous tag');
    });
    expect(resolveDeployTargetsFromTags('', 'v1.0.0', exec)).toEqual({
      fly: true,
      android: true,
    });
    expect(exec).not.toHaveBeenCalled();
  });
});

describe('isTagRangeArgv', () => {
  test('detects tag range argv', () => {
    expect(isTagRangeArgv(['v1.0.0', 'v1.1.0'])).toBe(true);
    expect(isTagRangeArgv(['--foo', 'feat(web): add page'])).toBe(false);
    expect(isTagRangeArgv(['v1.0.0'])).toBe(false);
    expect(isTagRangeArgv(['1.0.0', '1.1.0'])).toBe(false);
    expect(
      isTagRangeArgv([
        undefined as unknown as string,
        undefined as unknown as string,
      ]),
    ).toBe(false);
  });
});

describe('runResolveDeployTargetsCli', () => {
  const githubOutput = process.env['GITHUB_OUTPUT'];

  beforeEach(() => {
    delete process.env['GITHUB_OUTPUT'];
  });

  afterEach(() => {
    if (githubOutput === undefined) {
      delete process.env['GITHUB_OUTPUT'];
    } else {
      process.env['GITHUB_OUTPUT'] = githubOutput;
    }
  });

  test('resolves subjects from argv', () => {
    const stdoutSpy = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    runResolveDeployTargetsCli(['feat(app): add screen']);
    expect(stdoutSpy).toHaveBeenCalledWith(
      'deploy_fly=false\ndeploy_android=true\n',
    );
    stdoutSpy.mockRestore();
  });

  test('resolves tags from argv when tag mode is used', () => {
    const stdoutSpy = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    const exec = jest.fn(() =>
      logRecord('feat(web): add page', 'packages/web/src/Page.tsx'),
    );
    runResolveDeployTargetsCli(['v1.0.0', 'v1.1.0'], exec);
    expect(stdoutSpy).toHaveBeenCalledWith(
      'deploy_fly=true\ndeploy_android=false\n',
    );
    stdoutSpy.mockRestore();
  });

  test('resolves first release flag from argv', () => {
    const stdoutSpy = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    const exec = jest.fn(() => '');
    runResolveDeployTargetsCli(['--first-release', 'v1.0.0'], exec);
    expect(stdoutSpy).toHaveBeenCalledWith(
      'deploy_fly=true\ndeploy_android=true\n',
    );
    stdoutSpy.mockRestore();
  });

  test('resolves first release flag without explicit tag', () => {
    const stdoutSpy = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    const exec = jest.fn(() => '');
    runResolveDeployTargetsCli(['--first-release'], exec);
    expect(stdoutSpy).toHaveBeenCalledWith(
      'deploy_fly=true\ndeploy_android=true\n',
    );
    stdoutSpy.mockRestore();
  });
});

import {
  expandAffectedPackages,
  formatGithubOutput,
  packagesToDeployTargets,
  parseCommitScopes,
  resolveDeployTargetsFromSubjects,
  scopeToPackage,
  writeGithubOutput,
} from './resolveDeployTargets.ts';
import {
  getReleaseCommitSubjects,
  isDirectRun,
  isTagRangeArgv,
  maybeRunResolveDeployTargetsCli,
  resolveDeployTargetsFromTags,
  runResolveDeployTargetsCli,
} from './resolveDeployTargetsCli.ts';

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

describe('getReleaseCommitSubjects', () => {
  test('reads commit subjects from git log', () => {
    const exec = jest.fn(() => 'feat(web): add page\nfix(server): timeout');
    expect(getReleaseCommitSubjects('v1.0.0', 'v1.1.0', exec)).toEqual([
      'feat(web): add page',
      'fix(server): timeout',
    ]);
    expect(exec).toHaveBeenCalledWith(
      'git log v1.0.0..v1.1.0 --pretty=format:%s',
      {encoding: 'utf8'},
    );
  });

  test('returns empty array when git log is empty', () => {
    const exec = jest.fn(() => '');
    expect(getReleaseCommitSubjects('v1.0.0', 'v1.1.0', exec)).toEqual([]);
  });

  test('reads first release commits from tag parent', () => {
    const exec = jest.fn(() => 'feat(web): add page');
    expect(getReleaseCommitSubjects('', 'v1.0.0', exec)).toEqual([
      'feat(web): add page',
    ]);
    expect(exec).toHaveBeenCalledWith('git log v1.0.0^ --pretty=format:%s', {
      encoding: 'utf8',
    });
  });
});

describe('resolveDeployTargetsFromTags', () => {
  test('resolves deploy targets from git tags', () => {
    const exec = jest.fn(() => 'feat(client): add helper');
    expect(resolveDeployTargetsFromTags('v0.1.0', 'v0.2.0', exec)).toEqual({
      fly: true,
      android: true,
    });
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
    const exec = jest.fn(() => 'feat(web): add page');
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
    const exec = jest.fn(() => 'feat(web): add page');
    runResolveDeployTargetsCli(['--first-release', 'v1.0.0'], exec);
    expect(stdoutSpy).toHaveBeenCalledWith(
      'deploy_fly=true\ndeploy_android=false\n',
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
      'deploy_fly=false\ndeploy_android=false\n',
    );
    stdoutSpy.mockRestore();
  });
});

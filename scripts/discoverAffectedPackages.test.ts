import {readFileSync, unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {
  getChangedFiles,
  isAllAffectingFile,
  isIgnoredFile,
  isScriptsAffectingFile,
  parseArgs,
  resolveBase,
  workspaceForFile,
  writeOutput,
} from './affectedFiles.ts';
import {
  buildDependentsGraph,
  expandDependents,
  internalDepDirs,
  readWorkspaceNameMap,
} from './affectedGraph.ts';
import {
  diffedResult,
  discoverAffectedPackages,
  formatGithubOutput,
  isDirectRun,
  maybeRunDiscoverAffectedPackagesCli,
} from './discoverAffectedPackages.ts';
import type {DiscoverFs} from './discoverWorkspacePackages.ts';

const makeFs = (tree: Record<string, string | string[]>): DiscoverFs => ({
  existsSync: (path: string) => path in tree,
  readFileSync: (path: string) => {
    const value = tree[path];
    if (typeof value !== 'string') {
      throw new TypeError(`missing file: ${path}`);
    }
    return value;
  },
  readdirSync: (path: string) => {
    const value = tree[path];
    if (!Array.isArray(value)) {
      throw new TypeError(`missing dir: ${path}`);
    }
    return value.map(name => ({name, isDirectory: () => !name.includes('.')}));
  },
});

const pkgJson = (name: string, deps: Record<string, string> = {}) =>
  JSON.stringify({name, scripts: {test: 'jest'}, dependencies: deps});

const makeRepoFs = (): DiscoverFs =>
  makeFs({
    '/repo/packages/types/package.json': pkgJson('@eciperay/types'),
    '/repo/packages/client/package.json': pkgJson('@eciperay/client', {
      '@eciperay/types': '*',
    }),
    '/repo/packages/server/package.json': pkgJson('@eciperay/server', {
      '@eciperay/client': '*',
      '@eciperay/types': '*',
    }),
    '/repo/packages/web/package.json': pkgJson('@eciperay/web', {
      '@eciperay/client': '*',
    }),
    '/repo/packages/types': ['src'],
    '/repo/packages/types/src': ['index.ts'],
    '/repo/packages/client': ['src'],
    '/repo/packages/client/src': ['index.ts'],
    '/repo/packages/server': ['src'],
    '/repo/packages/server/src': ['index.ts'],
    '/repo/packages/web': ['src'],
    '/repo/packages/web/src': ['index.ts'],
  });

const WORKSPACES = [
  'packages/types',
  'packages/client',
  'packages/server',
  'packages/web',
];

describe('file classification', () => {
  it('maps package source files to their workspace', () => {
    expect(workspaceForFile('packages/server/src/index.ts')).toBe(
      'packages/server',
    );
    expect(workspaceForFile('packages/web/src/app.tsx')).toBe('packages/web');
  });

  it('returns undefined for non-package files', () => {
    expect(workspaceForFile('scripts/foo.ts')).toBeUndefined();
    expect(workspaceForFile('package.json')).toBeUndefined();
  });

  it('flags root files that affect everything', () => {
    expect(isAllAffectingFile('package-lock.json')).toBe(true);
    expect(isAllAffectingFile('patches/foo.patch')).toBe(true);
    expect(isAllAffectingFile('test/failOnConsoleError.cjs')).toBe(true);
    expect(isAllAffectingFile('packages/server/src/a.ts')).toBe(false);
  });

  it('flags scripts-affecting files', () => {
    expect(isScriptsAffectingFile('scripts/foo.ts')).toBe(true);
    expect(isScriptsAffectingFile('eslint-rules/bar.ts')).toBe(true);
    expect(isScriptsAffectingFile('jest.config.cjs')).toBe(true);
    expect(isScriptsAffectingFile('test/failOnConsoleError.cjs')).toBe(false);
    expect(isScriptsAffectingFile('packages/server/src/a.ts')).toBe(false);
  });

  it('ignores docs, workflows, hooks, and markdown', () => {
    expect(isIgnoredFile('docs/guide.md')).toBe(true);
    expect(isIgnoredFile('.github/workflows/ci.yml')).toBe(true);
    expect(isIgnoredFile('.husky/pre-commit')).toBe(true);
    expect(isIgnoredFile('README.md')).toBe(true);
    expect(isIgnoredFile('packages/server/src/a.ts')).toBe(false);
  });
});

describe('dependents graph', () => {
  it('builds the reverse dependency graph', () => {
    const fs = makeRepoFs();
    const nameToDir = readWorkspaceNameMap(
      '/repo',
      WORKSPACES,
      fs.readFileSync,
    );
    const graph = buildDependentsGraph(
      '/repo',
      WORKSPACES,
      nameToDir,
      fs.readFileSync,
    );
    expect([...(graph.get('packages/types') ?? [])].sort()).toEqual([
      'packages/client',
      'packages/server',
    ]);
    expect([...(graph.get('packages/client') ?? [])].sort()).toEqual([
      'packages/server',
      'packages/web',
    ]);
    expect(graph.get('packages/web')?.size).toBe(0);
  });

  it('expands transitive dependents', () => {
    const fs = makeRepoFs();
    const nameToDir = readWorkspaceNameMap(
      '/repo',
      WORKSPACES,
      fs.readFileSync,
    );
    const graph = buildDependentsGraph(
      '/repo',
      WORKSPACES,
      nameToDir,
      fs.readFileSync,
    );
    const expanded = expandDependents(new Set(['packages/types']), graph);
    expect([...expanded].sort()).toEqual([
      'packages/client',
      'packages/server',
      'packages/types',
      'packages/web',
    ]);
  });

  it('handles workspaces missing from the dependents map', () => {
    const expanded = expandDependents(new Set(['packages/ghost']), new Map());
    expect([...expanded]).toEqual(['packages/ghost']);
  });

  it('handles package.json files without dependency sections', () => {
    const fs = makeFs({
      '/repo/packages/bare/package.json': JSON.stringify({
        name: '@eciperay/bare',
        scripts: {test: 'jest'},
      }),
      '/repo/packages/bare': ['src'],
      '/repo/packages/bare/src': ['index.ts'],
    });
    const nameToDir = readWorkspaceNameMap(
      '/repo',
      ['packages/bare'],
      fs.readFileSync,
    );
    const graph = buildDependentsGraph(
      '/repo',
      ['packages/bare'],
      nameToDir,
      fs.readFileSync,
    );
    expect(graph.get('packages/bare')?.size).toBe(0);
  });
});

describe('discoverAffectedPackages', () => {
  it('includes dependents when a shared package changes', () => {
    const result = discoverAffectedPackages(
      '/repo',
      WORKSPACES,
      ['packages/types/src/index.ts'],
      makeRepoFs(),
    );
    expect(result.testPackages).toEqual([
      'packages/types',
      'packages/client',
      'packages/server',
      'packages/web',
    ]);
    expect(result.runScriptsTests).toBe(false);
  });

  it('limits to the changed package and its dependents', () => {
    const result = discoverAffectedPackages(
      '/repo',
      WORKSPACES,
      ['packages/web/src/app.tsx'],
      makeRepoFs(),
    );
    expect(result.testPackages).toEqual(['packages/web']);
    expect(result.lintPackages).toEqual(['packages/web']);
  });

  it('returns empty matrices for docs-only changes', () => {
    const result = discoverAffectedPackages(
      '/repo',
      WORKSPACES,
      ['docs/guide.md', 'README.md'],
      makeRepoFs(),
    );
    expect(result.testPackages).toEqual([]);
    expect(result.lintPackages).toEqual([]);
    expect(result.runScriptsTests).toBe(false);
  });

  it('runs only the scripts suite for scripts changes', () => {
    const result = discoverAffectedPackages(
      '/repo',
      WORKSPACES,
      ['scripts/foo.ts'],
      makeRepoFs(),
    );
    expect(result.testPackages).toEqual([]);
    expect(result.lintPackages).toEqual([]);
    expect(result.runScriptsTests).toBe(true);
  });

  it('runs all suites when shared test helpers change', () => {
    const result = discoverAffectedPackages(
      '/repo',
      WORKSPACES,
      ['test/failOnConsoleError.cjs'],
      makeRepoFs(),
    );
    expect(result.testPackages).toEqual(WORKSPACES);
    expect(result.lintPackages).toEqual(WORKSPACES);
    expect(result.runScriptsTests).toBe(true);
  });

  it('treats lockfile changes as affecting everything', () => {
    const result = discoverAffectedPackages(
      '/repo',
      WORKSPACES,
      ['package-lock.json'],
      makeRepoFs(),
    );
    expect(result.testPackages).toEqual(WORKSPACES);
    expect(result.runScriptsTests).toBe(true);
  });

  it('ignores unknown files outside packages', () => {
    const result = discoverAffectedPackages(
      '/repo',
      WORKSPACES,
      ['.github/workflows/ci.yml'],
      makeRepoFs(),
    );
    expect(result.testPackages).toEqual([]);
    expect(result.runScriptsTests).toBe(false);
  });
});

describe('cli helpers', () => {
  it('parses --base and --all', () => {
    expect(parseArgs(['node', 'script', '--base', 'origin/master'])).toEqual({
      base: 'origin/master',
      all: false,
    });
    expect(parseArgs(['node', 'script', '--all'])).toEqual({all: true});
    expect(parseArgs(['node', 'script'])).toEqual({
      base: undefined,
      all: false,
    });
  });

  it('formats github output', () => {
    const body = formatGithubOutput({
      testPackages: ['packages/server'],
      lintPackages: ['packages/server'],
      runScriptsTests: true,
    });
    expect(body).toContain('test-packages=["packages/server"]');
    expect(body).toContain('run-scripts-tests=true');
  });

  it('reads changed files from git diff', () => {
    const exec = jest.fn().mockReturnValue('a.ts\nb.ts\n');
    expect(getChangedFiles('/repo', 'origin/master', exec)).toEqual([
      'a.ts',
      'b.ts',
    ]);
    expect(exec).toHaveBeenCalledWith(
      'git diff --name-only origin/master..HEAD',
      {encoding: 'utf8', cwd: '/repo'},
    );
  });

  it('resolves the base from GitHub PR env vars', () => {
    expect(
      resolveBase(['node', 'script'], {
        GITHUB_EVENT_NAME: 'pull_request',
        GITHUB_BASE_REF: 'master',
      }),
    ).toEqual({base: 'origin/master', all: false});
  });

  it('falls back to full matrix without PR env vars', () => {
    expect(resolveBase(['node', 'script'], {})).toEqual({all: true});
  });

  it('prefers explicit flags over env vars', () => {
    expect(
      resolveBase(['node', 'script', '--all'], {
        GITHUB_EVENT_NAME: 'pull_request',
        GITHUB_BASE_REF: 'master',
      }),
    ).toEqual({all: true});
  });

  it('returns an empty list when the diff is empty', () => {
    const exec = jest.fn().mockReturnValue('  \n');
    expect(getChangedFiles('/repo', 'origin/master', exec)).toEqual([]);
  });
});

describe('writeOutput', () => {
  const originalGithubOutput = process.env['GITHUB_OUTPUT'];

  afterEach(() => {
    if (originalGithubOutput === undefined) {
      delete process.env['GITHUB_OUTPUT'];
    } else {
      process.env['GITHUB_OUTPUT'] = originalGithubOutput;
    }
  });

  it('appends to GITHUB_OUTPUT when set', () => {
    const outPath = join(tmpdir(), `test-github-output-${process.pid}.txt`);
    process.env['GITHUB_OUTPUT'] = outPath;
    writeOutput('hello=world\n');
    expect(readFileSync(outPath, 'utf8')).toBe('hello=world\n');
    unlinkSync(outPath);
  });

  it('writes to stdout when GITHUB_OUTPUT is unset', () => {
    delete process.env['GITHUB_OUTPUT'];
    const stdoutSpy = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    writeOutput('hello=world\n');
    expect(stdoutSpy).toHaveBeenCalledWith('hello=world\n');
    stdoutSpy.mockRestore();
  });
});

describe('affectedGraph edge cases', () => {
  it('skips workspaces with unreadable package.json', () => {
    const fs = makeFs({
      '/repo/packages/broken': ['src'],
      '/repo/packages/broken/src': ['index.ts'],
    });
    const throwingFs: DiscoverFs = {
      ...fs,
      readFileSync: () => {
        throw new Error('boom');
      },
    };
    const nameToDir = readWorkspaceNameMap(
      '/repo',
      ['packages/broken'],
      throwingFs.readFileSync,
    );
    expect(nameToDir.size).toBe(0);
    const graph = buildDependentsGraph(
      '/repo',
      ['packages/broken'],
      nameToDir,
      throwingFs.readFileSync,
    );
    expect(graph.get('packages/broken')?.size).toBe(0);
  });

  it('returns no dependents for an unknown package', () => {
    expect(internalDepDirs(undefined, 'packages/ghost', new Map())).toEqual([]);
  });
});

describe('diffedResult', () => {
  const fs = makeRepoFs();

  it('discovers from the diff on success', () => {
    const exec = jest.fn().mockReturnValue('packages/web/src/app.tsx\n');
    const result = diffedResult({
      root: '/repo',
      workspaces: WORKSPACES,
      fs,
      base: 'origin/master',
      deps: {execSync: exec},
    });
    expect(result.testPackages).toEqual(['packages/web']);
    expect(result.runScriptsTests).toBe(false);
  });

  it('falls back to the full matrix when the diff fails', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const exec = jest.fn().mockImplementation(() => {
      throw new Error('no git');
    });
    const result = diffedResult({
      root: '/repo',
      workspaces: WORKSPACES,
      fs,
      base: 'origin/master',
      deps: {execSync: exec},
    });
    expect(result.testPackages).toEqual(WORKSPACES);
    expect(result.runScriptsTests).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('origin/master'),
    );
    warnSpy.mockRestore();
  });
});

describe('cli arg edge cases', () => {
  it('treats a trailing --base flag as missing', () => {
    expect(parseArgs(['node', 'script', '--base'])).toEqual({
      base: undefined,
      all: false,
    });
  });

  it('falls back to full matrix for a PR event without a base ref', () => {
    expect(
      resolveBase(['node', 'script'], {GITHUB_EVENT_NAME: 'pull_request'}),
    ).toEqual({all: true});
  });
});

describe('isDirectRun', () => {
  it('detects direct execution from argv', () => {
    expect(
      isDirectRun(
        ['node', '/repo/scripts/discoverAffectedPackages.ts'],
        '/repo/scripts/discoverAffectedPackages.ts',
      ),
    ).toBe(true);
    expect(isDirectRun([], '/repo/scripts/discoverAffectedPackages.ts')).toBe(
      false,
    );
  });
});

describe('runDiscoverAffectedPackagesCli', () => {
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

  it('writes discovery output for the repo', async () => {
    const stdoutSpy = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    const {runDiscoverAffectedPackagesCli} =
      await import('./discoverAffectedPackages.ts');
    runDiscoverAffectedPackagesCli();
    expect(stdoutSpy).toHaveBeenCalled();
    stdoutSpy.mockRestore();
  });

  it('diffs against the base when --base is passed', async () => {
    const stdoutSpy = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    const {runDiscoverAffectedPackagesCli} =
      await import('./discoverAffectedPackages.ts');
    const execSync = jest.fn().mockReturnValue('packages/web/src/app.tsx\n');
    runDiscoverAffectedPackagesCli(
      {execSync},
      ['node', 'script', '--base', 'origin/master'],
      {},
    );
    const output = stdoutSpy.mock.calls.map(call => String(call[0])).join('');
    expect(output).toContain('test-packages=["packages/web"]');
    stdoutSpy.mockRestore();
  });

  it('falls back to the full matrix without a base', async () => {
    const stdoutSpy = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    const {runDiscoverAffectedPackagesCli} =
      await import('./discoverAffectedPackages.ts');
    runDiscoverAffectedPackagesCli(
      {execSync: jest.fn()},
      ['node', 'script'],
      {},
    );
    const output = stdoutSpy.mock.calls.map(call => String(call[0])).join('');
    expect(output).toContain('run-scripts-tests=true');
    stdoutSpy.mockRestore();
  });
});

describe('maybeRunDiscoverAffectedPackagesCli', () => {
  it('skips cli when not a direct run', () => {
    expect(() => {
      maybeRunDiscoverAffectedPackagesCli(false);
    }).not.toThrow();
  });

  it('runs cli when direct run is true', () => {
    const run = jest.fn();
    maybeRunDiscoverAffectedPackagesCli(true, run);
    expect(run).toHaveBeenCalled();
  });
});

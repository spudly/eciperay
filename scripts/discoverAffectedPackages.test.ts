import {
  getChangedFiles,
  isAllAffectingRootFile,
  isIgnoredFile,
  isScriptsAffectingFile,
  parseArgs,
  resolveBase,
  workspaceForFile,
} from './affectedFiles.ts';
import {
  buildDependentsGraph,
  expandDependents,
  readWorkspaceNameMap,
} from './affectedGraph.ts';
import {
  discoverAffectedPackages,
  formatGithubOutput,
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
    expect(isAllAffectingRootFile('package-lock.json')).toBe(true);
    expect(isAllAffectingRootFile('patches/foo.patch')).toBe(true);
    expect(isAllAffectingRootFile('packages/server/src/a.ts')).toBe(false);
  });

  it('flags scripts-affecting files', () => {
    expect(isScriptsAffectingFile('scripts/foo.ts')).toBe(true);
    expect(isScriptsAffectingFile('eslint-rules/bar.ts')).toBe(true);
    expect(isScriptsAffectingFile('jest.config.cjs')).toBe(true);
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

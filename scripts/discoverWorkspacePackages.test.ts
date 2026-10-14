import {readFileSync} from 'node:fs';
import {join} from 'node:path';

import {
  discoverWorkspacePackages,
  formatGithubOutput,
  hasLintableFiles,
  isDirectRun,
  maybeRunDiscoverWorkspacePackagesCli,
  writeGithubOutput,
  type DiscoverFs,
} from './discoverWorkspacePackages.ts';

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

describe('hasLintableFiles', () => {
  it('returns false for missing directories', () => {
    const fs = makeFs({});
    expect(hasLintableFiles('/missing', fs)).toBe(false);
  });

  it('finds nested lintable files', () => {
    const fs = makeFs({'/pkg': ['src'], '/pkg/src': ['index.ts']});
    expect(hasLintableFiles('/pkg', fs)).toBe(true);
  });

  it('skips ignored directories', () => {
    const fs = makeFs({
      '/pkg': ['node_modules'],
      '/pkg/node_modules': ['ignored.ts'],
    });
    expect(hasLintableFiles('/pkg', fs)).toBe(false);
  });
});

describe('discoverWorkspacePackages', () => {
  it('discovers test and lint packages from workspace metadata', () => {
    const fs = makeFs({
      '/repo/packages/client/package.json': JSON.stringify({
        scripts: {test: 'jest'},
      }),
      '/repo/packages/types/package.json': JSON.stringify({}),
      '/repo/packages/client': ['src'],
      '/repo/packages/client/src': ['index.ts'],
      '/repo/packages/types': ['src'],
      '/repo/packages/types/src': ['index.ts'],
    });

    const result = discoverWorkspacePackages(
      '/repo',
      ['packages/client', 'packages/types'],
      fs,
    );

    expect(result.testPackages).toEqual(['packages/client']);
    expect(result.lintPackages).toEqual(['packages/client', 'packages/types']);
  });

  it('prefers test:coverage over test script', () => {
    const fs = makeFs({
      '/repo/packages/web/package.json': JSON.stringify({
        scripts: {'test:coverage': 'vitest run --coverage', 'test': 'vitest'},
      }),
      '/repo/packages/web': ['src'],
      '/repo/packages/web/src': ['main.tsx'],
    });

    const result = discoverWorkspacePackages('/repo', ['packages/web'], fs);
    expect(result.testPackages).toEqual(['packages/web']);
  });

  it('skips workspaces without package.json', () => {
    const fs = makeFs({});
    const result = discoverWorkspacePackages('/repo', ['packages/missing'], fs);
    expect(result.testPackages).toEqual([]);
  });
});

describe('formatGithubOutput', () => {
  it('formats github output lines', () => {
    expect(
      formatGithubOutput({
        testPackages: ['packages/client'],
        lintPackages: ['packages/client', 'packages/web'],
      }),
    ).toBe(
      'test-packages=["packages/client"]\nlint-packages=["packages/client","packages/web"]\n',
    );
  });
});

describe('writeGithubOutput', () => {
  it('writes to GITHUB_OUTPUT when provided', () => {
    const append = jest.fn();
    writeGithubOutput(
      {testPackages: ['packages/client'], lintPackages: ['packages/client']},
      '/tmp/github-output',
      append,
    );
    expect(append).toHaveBeenCalledWith(
      '/tmp/github-output',
      'test-packages=["packages/client"]\nlint-packages=["packages/client"]\n',
    );
  });

  it('writes to stdout when GITHUB_OUTPUT is unset', () => {
    const stdoutSpy = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    writeGithubOutput(
      {testPackages: [], lintPackages: []},
      undefined,
      jest.fn(),
    );
    expect(stdoutSpy).toHaveBeenCalledWith(
      'test-packages=[]\nlint-packages=[]\n',
    );
    stdoutSpy.mockRestore();
  });
});

describe('isDirectRun', () => {
  it('detects direct execution from argv', () => {
    expect(
      isDirectRun(
        ['node', '/repo/scripts/discoverWorkspacePackages.ts'],
        '/repo/scripts/discoverWorkspacePackages.ts',
      ),
    ).toBe(true);
    expect(isDirectRun([], '/repo/scripts/discoverWorkspacePackages.ts')).toBe(
      false,
    );
  });
});

describe('runDiscoverWorkspacePackagesCli', () => {
  const githubOutput = process.env['GITHUB_OUTPUT'];

  afterEach(() => {
    if (githubOutput === undefined) {
      delete process.env['GITHUB_OUTPUT'];
    } else {
      process.env['GITHUB_OUTPUT'] = githubOutput;
    }
  });

  it('writes discovery output for the repo', async () => {
    delete process.env['GITHUB_OUTPUT'];
    const stdoutSpy = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    const {runDiscoverWorkspacePackagesCli} =
      await import('./discoverWorkspacePackages.ts');
    runDiscoverWorkspacePackagesCli();
    expect(stdoutSpy).toHaveBeenCalled();
    stdoutSpy.mockRestore();
  });
});

describe('maybeRunDiscoverWorkspacePackagesCli', () => {
  it('skips cli when not a direct run', () => {
    expect(() => {
      maybeRunDiscoverWorkspacePackagesCli(false);
    }).not.toThrow();
  });

  it('runs cli when direct run is true', () => {
    const run = jest.fn();
    maybeRunDiscoverWorkspacePackagesCli(true, run);
    expect(run).toHaveBeenCalled();
  });
});

describe('ci workflow', () => {
  it('discovers packages via npm script after installing dependencies', () => {
    const repoRoot = new URL('..', import.meta.url).pathname;
    const ci = readFileSync(join(repoRoot, '.github/workflows/ci.yml'), 'utf8');
    expect(ci).toContain('uses: ./.github/actions/ci-setup');
    expect(ci).toContain('npm run discover:affected-packages');
    expect(ci).not.toMatch(/run: tsx scripts\/discoverAffectedPackages\.ts/u);
  });
});

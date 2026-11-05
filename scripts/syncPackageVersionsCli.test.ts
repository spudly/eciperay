import {join} from 'node:path';

import {
  isDirectRun,
  maybeRunSyncPackageVersionsCli,
  runSyncPackageVersionsCli,
} from './syncPackageVersionsCli.ts';
import type {SyncFs} from './syncPackageVersions.ts';

const makeFs = (files: Record<string, string>): SyncFs => ({
  readFileSync: (path: string) => {
    const value = files[path];
    if (value === undefined) {
      throw new Error(`missing file: ${path}`);
    }
    return value;
  },
  writeFileSync: (path: string, data: string) => {
    files[path] = data;
  },
});

const makeRepoFiles = (): Record<string, string> => ({
  '/repo/package.json': JSON.stringify({
    name: 'demo',
    version: '1.0.0',
    workspaces: [],
  }),
  '/repo/package-lock.json': JSON.stringify({
    name: 'demo',
    version: '0.9.0',
    packages: {'': {name: 'demo', version: '0.9.0'}},
  }),
});

const makeDeps = (files: Record<string, string>) => {
  const logs: string[] = [];
  const errors: string[] = [];
  const exits: number[] = [];
  return {
    logs,
    errors,
    exits,
    deps: {
      fs: makeFs(files),
      log: {
        log: (msg: string) => logs.push(msg),
        error: (msg: string) => errors.push(msg),
      },
      exit: (code: number) => exits.push(code),
    },
  };
};

describe('runSyncPackageVersionsCli', () => {
  test('sync mode stamps the lockfile and reports the fix count', () => {
    const files = makeRepoFiles();
    const {deps, logs, exits} = makeDeps(files);
    runSyncPackageVersionsCli('/repo', [], deps);
    expect(exits).toEqual([]);
    expect(logs.join('\n')).toContain('Synced 2');
    expect(JSON.parse(files['/repo/package-lock.json'] ?? '').version).toBe(
      '1.0.0',
    );
  });

  test('--check exits 1 without writing when the lockfile is stale', () => {
    const files = makeRepoFiles();
    const before = files['/repo/package-lock.json'];
    const {deps, errors, exits} = makeDeps(files);
    runSyncPackageVersionsCli('/repo', ['--check'], deps);
    expect(exits).toEqual([1]);
    expect(errors.join('\n')).toContain('out of sync');
    expect(files['/repo/package-lock.json']).toBe(before);
  });

  test('--check passes when the lockfile is synced', () => {
    const files = makeRepoFiles();
    files['/repo/package-lock.json'] = JSON.stringify({
      name: 'demo',
      version: '1.0.0',
      packages: {'': {name: 'demo', version: '1.0.0'}},
    });
    const {deps, logs, exits} = makeDeps(files);
    runSyncPackageVersionsCli('/repo', ['--check'], deps);
    expect(exits).toEqual([]);
    expect(logs.join('\n')).toContain('match the manifests');
  });

  test('sync mode uses the singular noun when exactly one entry is fixed', () => {
    const files = makeRepoFiles();
    files['/repo/package-lock.json'] = JSON.stringify({
      name: 'demo',
      version: '1.0.0',
      packages: {'': {name: 'demo', version: '0.9.0'}},
    });
    const {deps, logs, exits} = makeDeps(files);
    runSyncPackageVersionsCli('/repo', [], deps);
    expect(exits).toEqual([]);
    expect(logs.join('\n')).toContain(
      'Synced 1 package-lock.json workspace version entry to',
    );
  });

  test('sync mode reports when the lockfile already matches', () => {
    const files = makeRepoFiles();
    files['/repo/package-lock.json'] = JSON.stringify({
      name: 'demo',
      version: '1.0.0',
      packages: {'': {name: 'demo', version: '1.0.0'}},
    });
    const {deps, logs, exits} = makeDeps(files);
    runSyncPackageVersionsCli('/repo', [], deps);
    expect(exits).toEqual([]);
    expect(logs.join('\n')).toContain('already match the manifests');
  });

  test('sync mode is the default when argv is omitted', () => {
    const files = makeRepoFiles();
    const {deps, logs} = makeDeps(files);
    runSyncPackageVersionsCli('/repo', undefined, deps);
    expect(logs.join('\n')).toContain('Synced 2');
  });

  test('uses process.exit when exit dep is omitted and --check fails', () => {
    const exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((() => {}) as never);
    const files = makeRepoFiles();
    const {deps} = makeDeps(files);
    runSyncPackageVersionsCli('/repo', ['--check'], {
      fs: deps.fs,
      log: deps.log,
    });
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  test('uses the real filesystem and console when all deps are omitted', () => {
    const root = join(import.meta.dirname, '..');
    expect(() => runSyncPackageVersionsCli(root, ['--check'])).not.toThrow();
  });
});

describe('isDirectRun', () => {
  test('detects direct execution from argv', () => {
    expect(
      isDirectRun(
        ['node', '/repo/scripts/syncPackageVersionsCli.ts'],
        '/repo/scripts/syncPackageVersionsCli.ts',
      ),
    ).toBe(true);
    expect(
      isDirectRun(
        ['node', '/repo/scripts/other.ts'],
        '/repo/scripts/syncPackageVersionsCli.ts',
      ),
    ).toBe(false);
    expect(isDirectRun([], '/repo/scripts/syncPackageVersionsCli.ts')).toBe(
      false,
    );
    expect(isDirectRun()).toBe(false);
  });
});

describe('maybeRunSyncPackageVersionsCli', () => {
  test('runs only when invoked directly', () => {
    const run = jest.fn();
    maybeRunSyncPackageVersionsCli(false, run);
    maybeRunSyncPackageVersionsCli(true, run);
    expect(run).toHaveBeenCalledTimes(1);
  });

  test('does not run by default under the test runner', () => {
    expect(() => {
      maybeRunSyncPackageVersionsCli();
    }).not.toThrow();
  });

  test('runs the default CLI entrypoint when invoked directly', () => {
    expect(() => {
      maybeRunSyncPackageVersionsCli(true);
    }).not.toThrow();
  });
});

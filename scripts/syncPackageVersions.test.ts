import {mkdtempSync, mkdirSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {
  isDirectRun,
  listWorkspacePackageJsonPaths,
  maybeRunSyncPackageVersionsCli,
  runSyncPackageVersionsCli,
  setLockfileVersions,
  setPackageJsonVersion,
  syncPackageVersions,
  type SyncFs,
} from './syncPackageVersions.ts';

const makeFs = (
  files: Record<string, string>,
  dirs: Record<string, string[]> = {},
): SyncFs => ({
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
  readdirSync: (path: string) => {
    const entries = dirs[path];
    if (!entries) {
      throw new Error(`missing dir: ${path}`);
    }
    return entries.map(name => ({name, isDirectory: () => true}));
  },
});

describe('listWorkspacePackageJsonPaths', () => {
  test('lists workspace package.json files', () => {
    const fs = makeFs({}, {'/repo/packages': ['app', 'web']});
    expect(listWorkspacePackageJsonPaths('/repo', fs)).toEqual([
      '/repo/packages/app/package.json',
      '/repo/packages/web/package.json',
    ]);
  });
});

describe('setPackageJsonVersion', () => {
  test('updates version field', () => {
    const files = {
      '/pkg/package.json': JSON.stringify({name: 'demo', version: '0.0.0'}),
    };
    const fs = makeFs(files);
    setPackageJsonVersion('/pkg/package.json', '1.2.3', fs);
    expect(JSON.parse(files['/pkg/package.json'])).toEqual({
      name: 'demo',
      version: '1.2.3',
    });
  });
});

describe('setLockfileVersions', () => {
  test('updates root and workspace lockfile versions', () => {
    const files = {
      '/repo/package-lock.json': JSON.stringify({
        version: '0.0.0',
        packages: {
          '': {version: '0.0.0'},
          'packages/app': {version: '0.0.1'},
          'packages/web': {version: '0.0.0'},
        },
      }),
    };
    const fs = makeFs(files);
    setLockfileVersions({
      lockfilePath: '/repo/package-lock.json',
      version: '1.0.0',
      root: '/repo',
      workspacePackageJsonPaths: [
        '/repo/packages/app/package.json',
        '/repo/packages/web/package.json',
      ],
      fs,
    });
    const lock = JSON.parse(files['/repo/package-lock.json']) as {
      version: string;
      packages: Record<string, {version: string}>;
    };
    expect(lock.version).toBe('1.0.0');
    expect(lock.packages[''].version).toBe('1.0.0');
    expect(lock.packages['packages/app'].version).toBe('1.0.0');
    expect(lock.packages['packages/web'].version).toBe('1.0.0');
  });

  test('updates workspace keys from non-root-relative paths', () => {
    const files = {
      '/repo/package-lock.json': JSON.stringify({
        version: '0.0.0',
        packages: {'packages/app': {version: '0.0.0'}},
      }),
    };
    const fs = makeFs(files);
    setLockfileVersions({
      lockfilePath: '/repo/package-lock.json',
      version: '1.0.0',
      root: '/repo',
      workspacePackageJsonPaths: ['packages/app/package.json'],
      fs,
    });
    const lock = JSON.parse(files['/repo/package-lock.json']) as {
      packages: Record<string, {version: string}>;
    };
    expect(lock.packages['packages/app'].version).toBe('1.0.0');
  });
});

describe('syncPackageVersions', () => {
  test('syncs root, workspace packages, and lockfile', () => {
    const files: Record<string, string> = {
      '/repo/package.json': JSON.stringify({
        name: 'eciperay',
        version: '0.0.0',
      }),
      '/repo/packages/app/package.json': JSON.stringify({
        name: '@eciperay/app',
        version: '0.0.1',
      }),
      '/repo/package-lock.json': JSON.stringify({
        version: '0.0.0',
        packages: {'': {version: '0.0.0'}, 'packages/app': {version: '0.0.1'}},
      }),
    };
    const fs = makeFs(files, {'/repo/packages': ['app']});
    const updated = syncPackageVersions('/repo', '2.0.0', fs);

    expect(updated).toEqual([
      '/repo/package.json',
      '/repo/packages/app/package.json',
      '/repo/package-lock.json',
    ]);
    expect(JSON.parse(files['/repo/package.json']).version).toBe('2.0.0');
    expect(JSON.parse(files['/repo/packages/app/package.json']).version).toBe(
      '2.0.0',
    );
    expect(JSON.parse(files['/repo/package-lock.json']).version).toBe('2.0.0');
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

describe('maybeRunSyncPackageVersionsCli', () => {
  test('runs cli when invoked directly', () => {
    const run = jest.fn();
    maybeRunSyncPackageVersionsCli(true, run);
    expect(run).toHaveBeenCalled();
  });

  test('skips cli when imported', () => {
    const run = jest.fn();
    maybeRunSyncPackageVersionsCli(false, run);
    expect(run).not.toHaveBeenCalled();
  });
});

describe('runSyncPackageVersionsCli', () => {
  test('exits when version is missing', () => {
    const exit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    const error = jest.spyOn(console, 'error').mockImplementation(() => {
      /* noop */
    });
    expect(() => {
      runSyncPackageVersionsCli('');
    }).toThrow('exit');
    expect(error).toHaveBeenCalled();
    exit.mockRestore();
    error.mockRestore();
  });

  test('syncs versions from argv using filesystem helpers', () => {
    const files: Record<string, string> = {
      '/repo/package.json': JSON.stringify({version: '0.0.0'}),
      '/repo/packages/app/package.json': JSON.stringify({version: '0.0.0'}),
      '/repo/package-lock.json': JSON.stringify({
        version: '0.0.0',
        packages: {'': {version: '0.0.0'}, 'packages/app': {version: '0.0.0'}},
      }),
    };
    const fs = makeFs(files, {'/repo/packages': ['app']});
    syncPackageVersions('/repo', '1.2.3', fs);
    expect(JSON.parse(files['/repo/package.json']).version).toBe('1.2.3');
  });

  test('logs synced file count', () => {
    const root = mkdtempSync(join(tmpdir(), 'sync-versions-'));
    mkdirSync(join(root, 'packages', 'app'), {recursive: true});
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({version: '0.0.0'}),
    );
    writeFileSync(
      join(root, 'packages', 'app', 'package.json'),
      JSON.stringify({version: '0.0.0'}),
    );
    writeFileSync(
      join(root, 'package-lock.json'),
      JSON.stringify({
        version: '0.0.0',
        packages: {'': {version: '0.0.0'}, 'packages/app': {version: '0.0.0'}},
      }),
    );
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    runSyncPackageVersionsCli('4.5.6', root);
    expect(log).toHaveBeenCalledWith('Synced version 4.5.6 in 3 files');
    log.mockRestore();
  });
});

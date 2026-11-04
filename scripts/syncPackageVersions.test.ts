import {
  findLockfileVersionMismatches,
  findLockfileWorkspaceVersionMismatches,
  readWorkspaceVersions,
  setPackageJsonVersion,
  syncLockfileVersions,
  syncLockfileWorkspaceVersions,
  type SyncFs,
} from './syncPackageVersions.ts';

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

  test('adds the version field when absent', () => {
    const files = {'/pkg/package.json': JSON.stringify({name: 'demo'})};
    const fs = makeFs(files);
    setPackageJsonVersion('/pkg/package.json', '2.0.0', fs);
    expect(JSON.parse(files['/pkg/package.json'])).toEqual({
      name: 'demo',
      version: '2.0.0',
    });
  });
});

const makeRepoFiles = (
  lockVersion: string,
  appLockVersion: string,
): Record<string, string> => ({
  '/repo/package.json': JSON.stringify({
    name: 'demo',
    version: '1.0.0',
    workspaces: ['packages/app'],
  }),
  '/repo/packages/app/package.json': JSON.stringify({
    name: '@demo/app',
    version: '2.0.0',
  }),
  '/repo/package-lock.json': JSON.stringify(
    {
      name: 'demo',
      version: lockVersion,
      packages: {
        '': {name: 'demo', version: lockVersion},
        'packages/app': {name: '@demo/app', version: appLockVersion},
        'node_modules/left-pad': {version: '1.3.0'},
      },
    },
    null,
    2,
  ),
});

describe('readWorkspaceVersions', () => {
  test('reads the root and workspace manifest versions', () => {
    const fs = makeFs(makeRepoFiles('1.0.0', '2.0.0'));
    expect(readWorkspaceVersions('/repo', fs)).toEqual({
      '': '1.0.0',
      'packages/app': '2.0.0',
    });
  });

  test('throws when a workspace manifest has no version', () => {
    const files = makeRepoFiles('1.0.0', '2.0.0');
    files['/repo/packages/app/package.json'] = JSON.stringify({
      name: '@demo/app',
    });
    expect(() => readWorkspaceVersions('/repo', makeFs(files))).toThrow(
      'Expected a string version in packages/app/package.json',
    );
  });
});

describe('syncLockfileWorkspaceVersions', () => {
  test('stamps stale root and workspace entries from the manifests', () => {
    const files = makeRepoFiles('0.9.0', '1.9.0');
    const fixed = syncLockfileWorkspaceVersions('/repo', makeFs(files));
    expect(fixed).toHaveLength(3);
    const lock = JSON.parse(files['/repo/package-lock.json'] ?? '');
    expect(lock.version).toBe('1.0.0');
    expect(lock.packages[''].version).toBe('1.0.0');
    expect(lock.packages['packages/app'].version).toBe('2.0.0');
    // Non-workspace entries are never touched.
    expect(lock.packages['node_modules/left-pad'].version).toBe('1.3.0');
  });

  test('is idempotent: an already-synced lockfile is not rewritten', () => {
    const files = makeRepoFiles('1.0.0', '2.0.0');
    const before = files['/repo/package-lock.json'];
    const fixed = syncLockfileWorkspaceVersions('/repo', makeFs(files));
    expect(fixed).toEqual([]);
    expect(files['/repo/package-lock.json']).toBe(before);
  });

  test('throws when a workspace entry is missing from the lockfile', () => {
    const files = makeRepoFiles('1.0.0', '2.0.0');
    const lock = JSON.parse(files['/repo/package-lock.json'] ?? '');
    delete lock.packages['packages/app'];
    files['/repo/package-lock.json'] = JSON.stringify(lock, null, 2);
    expect(() => syncLockfileWorkspaceVersions('/repo', makeFs(files))).toThrow(
      'missing workspace entries: packages/app',
    );
  });
});

describe('findLockfileVersionMismatches', () => {
  test('reports stale entries and passes a synced lockfile', () => {
    const files = makeRepoFiles('0.9.0', '2.0.0');
    const fs = makeFs(files);
    const mismatches = findLockfileWorkspaceVersionMismatches('/repo', fs);
    expect(mismatches).toEqual([
      {
        entry: '(lockfile version)',
        lockfileVersion: '0.9.0',
        manifestVersion: '1.0.0',
      },
      {entry: '', lockfileVersion: '0.9.0', manifestVersion: '1.0.0'},
    ]);
    expect(
      findLockfileVersionMismatches(
        {version: '1.0.0', packages: {'': {version: '1.0.0'}}},
        {'': '1.0.0'},
      ),
    ).toEqual([]);
  });

  test('syncLockfileVersions returns the mismatches it fixed', () => {
    const lock = {version: '0.9.0', packages: {'': {version: '0.9.0'}}};
    const fixed = syncLockfileVersions(lock, {'': '1.0.0'});
    expect(fixed).toHaveLength(2);
    expect(lock.version).toBe('1.0.0');
    expect(lock.packages[''].version).toBe('1.0.0');
  });
});

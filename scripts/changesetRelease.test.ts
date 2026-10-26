import {mkdtempSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {
  execFileSyncExec,
  extractReleaseNotes,
  isDirectRun,
  maybeRunChangesetReleaseCli,
  publishChangesetRelease,
  readGroupVersion,
  readReleaseNotes,
  remoteTagExists,
  runChangesetReleaseCli,
  syncRootVersion,
  type ReleaseExec,
  type ReleaseFs,
} from './changesetRelease.ts';

const makeFs = (files: Record<string, string>): ReleaseFs => ({
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
  existsSync: (path: string) => path in files,
});

const makeExec = (
  handler: (command: string, args: string[]) => string,
): {calls: string[][]; exec: ReleaseExec} => {
  const calls: string[][] = [];
  const exec: ReleaseExec = (command, args) => {
    calls.push([command, ...args]);
    return handler(command, args);
  };
  return {calls, exec};
};

const releaseFiles = (): Record<string, string> => ({
  '/repo/packages/app/package.json': JSON.stringify({
    name: '@eciperay/app',
    version: '1.34.0',
  }),
  '/repo/package.json': JSON.stringify({name: 'eciperay', version: '1.33.0'}),
  '/repo/package-lock.json': JSON.stringify({
    version: '1.33.0',
    packages: {'': {version: '1.33.0'}, 'packages/app': {version: '1.34.0'}},
  }),
  '/repo/packages/app/CHANGELOG.md': [
    '# @eciperay/app',
    '',
    '## 1.34.0',
    '',
    '### Minor Changes',
    '',
    '- Seed entry',
    '',
    '## 1.33.0',
    '',
    '### Patch Changes',
    '',
    '- Old entry',
    '',
  ].join('\n'),
});

describe('readGroupVersion', () => {
  test('reads the version from the app package', () => {
    const fs = makeFs(releaseFiles());
    expect(readGroupVersion('/repo', fs)).toBe('1.34.0');
  });

  test('throws when the version is missing', () => {
    const fs = makeFs({
      '/repo/packages/app/package.json': JSON.stringify({name: 'app'}),
    });
    expect(() => readGroupVersion('/repo', fs)).toThrow(
      'Expected a string version in packages/app/package.json',
    );
  });

  test('throws when the version is empty', () => {
    const fs = makeFs({
      '/repo/packages/app/package.json': JSON.stringify({version: ''}),
    });
    expect(() => readGroupVersion('/repo', fs)).toThrow(
      'Expected a string version in packages/app/package.json',
    );
  });
});

describe('syncRootVersion', () => {
  test('syncs root package.json and root lockfile entries only', () => {
    const files = releaseFiles();
    const fs = makeFs(files);
    syncRootVersion('/repo', '1.34.0', fs);
    expect(JSON.parse(files['/repo/package.json']).version).toBe('1.34.0');
    const lock = JSON.parse(files['/repo/package-lock.json']) as {
      version: string;
      packages: Record<string, {version: string}>;
    };
    expect(lock.version).toBe('1.34.0');
    expect(lock.packages[''].version).toBe('1.34.0');
    expect(lock.packages['packages/app'].version).toBe('1.34.0');
  });

  test('tolerates a lockfile without a root package entry', () => {
    const files = {
      '/repo/package.json': JSON.stringify({version: '1.33.0'}),
      '/repo/package-lock.json': JSON.stringify({
        version: '1.33.0',
        packages: {'packages/app': {version: '1.34.0'}},
      }),
    };
    const fs = makeFs(files);
    syncRootVersion('/repo', '1.34.0', fs);
    const lock = JSON.parse(files['/repo/package-lock.json']) as {
      version: string;
    };
    expect(lock.version).toBe('1.34.0');
  });

  test('tolerates a lockfile without a packages map', () => {
    const files = {
      '/repo/package.json': JSON.stringify({version: '1.33.0'}),
      '/repo/package-lock.json': JSON.stringify({version: '1.33.0'}),
    };
    const fs = makeFs(files);
    syncRootVersion('/repo', '1.34.0', fs);
    const lock = JSON.parse(files['/repo/package-lock.json']) as {
      version: string;
    };
    expect(lock.version).toBe('1.34.0');
  });
});

describe('remoteTagExists', () => {
  test('is false when ls-remote finds nothing', () => {
    const {exec} = makeExec(() => '');
    expect(remoteTagExists(exec, 'v1.34.0')).toBe(false);
  });

  test('is true when ls-remote returns the ref', () => {
    const {exec} = makeExec(() => 'abc123\trefs/tags/v1.34.0');
    expect(remoteTagExists(exec, 'v1.34.0')).toBe(true);
  });
});

describe('extractReleaseNotes', () => {
  test('extracts the section for the version', () => {
    const changelog = releaseFiles()['/repo/packages/app/CHANGELOG.md'];
    expect(extractReleaseNotes(changelog, '1.34.0')).toBe(
      '### Minor Changes\n\n- Seed entry',
    );
  });

  test('extracts the last section through end of file', () => {
    const changelog = releaseFiles()['/repo/packages/app/CHANGELOG.md'];
    expect(extractReleaseNotes(changelog, '1.33.0')).toBe(
      '### Patch Changes\n\n- Old entry',
    );
  });

  test('returns null when the version has no section', () => {
    expect(extractReleaseNotes('# Changelog\n', '9.9.9')).toBeNull();
  });

  test('returns null when the section is empty', () => {
    const changelog = '## 1.34.0\n\n## 1.33.0\n\n- Old entry\n';
    expect(extractReleaseNotes(changelog, '1.34.0')).toBeNull();
  });
});

describe('readReleaseNotes', () => {
  test('falls through changelogs until a section is found', () => {
    const files = releaseFiles();
    files['/repo/packages/app/CHANGELOG.md'] = '# @eciperay/app\n';
    files['/repo/packages/web/CHANGELOG.md'] =
      '## 1.34.0\n\n### Minor Changes\n\n- Web entry\n';
    const fs = makeFs(files);
    expect(readReleaseNotes('/repo', '1.34.0', fs)).toBe(
      '### Minor Changes\n\n- Web entry',
    );
  });

  test('falls back to a generic note when no changelog has the section', () => {
    const fs = makeFs({});
    expect(readReleaseNotes('/repo', '1.34.0', fs)).toBe('Release v1.34.0');
  });
});

describe('publishChangesetRelease', () => {
  test('does nothing when the tag already exists', () => {
    const files = releaseFiles();
    const fs = makeFs(files);
    const {calls, exec} = makeExec(() => 'abc123\trefs/tags/v1.34.0');
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const result = publishChangesetRelease('/repo', fs, exec);
    expect(result).toEqual({
      status: 'already-released',
      version: '1.34.0',
      tag: 'v1.34.0',
    });
    expect(calls).toHaveLength(1);
    expect(JSON.parse(files['/repo/package.json']).version).toBe('1.33.0');
    log.mockRestore();
  });

  test('syncs root, commits, tags, and opens the release', () => {
    const files = releaseFiles();
    const fs = makeFs(files);
    const {calls, exec} = makeExec((_command, args) =>
      args[0] === 'diff' ? 'package.json\npackage-lock.json' : '',
    );
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const result = publishChangesetRelease('/repo', fs, exec);
    expect(result).toEqual({
      status: 'published',
      version: '1.34.0',
      tag: 'v1.34.0',
    });
    expect(JSON.parse(files['/repo/package.json']).version).toBe('1.34.0');
    expect(calls).toContainEqual([
      'git',
      'commit',
      '-m',
      'chore(release): 1.34.0 [skip ci]',
    ]);
    expect(calls).toContainEqual(['git', 'push', 'origin', 'HEAD:master']);
    expect(calls).toContainEqual(['git', 'tag', 'v1.34.0']);
    expect(calls).toContainEqual(['git', 'push', 'origin', 'v1.34.0']);
    expect(calls).toContainEqual([
      'gh',
      'release',
      'create',
      'v1.34.0',
      '--title',
      'v1.34.0',
      '--notes',
      '### Minor Changes\n\n- Seed entry',
    ]);
    log.mockRestore();
  });

  test('tags HEAD without a commit when the root is already synced', () => {
    const files = releaseFiles();
    files['/repo/package.json'] = JSON.stringify({
      name: 'eciperay',
      version: '1.34.0',
    });
    files['/repo/package-lock.json'] = JSON.stringify({
      version: '1.34.0',
      packages: {'': {version: '1.34.0'}, 'packages/app': {version: '1.34.0'}},
    });
    const fs = makeFs(files);
    const {calls, exec} = makeExec(() => '');
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const result = publishChangesetRelease('/repo', fs, exec);
    expect(result.status).toBe('published');
    expect(calls.some(call => call[1] === 'commit')).toBe(false);
    expect(calls).toContainEqual(['git', 'tag', 'v1.34.0']);
    log.mockRestore();
  });
});

describe('execFileSyncExec', () => {
  test('returns trimmed stdout', () => {
    expect(
      execFileSyncExec(process.execPath, [
        '-e',
        'process.stdout.write(" hi ")',
      ]),
    ).toBe('hi');
  });
});

describe('isDirectRun', () => {
  test('returns false without argv entry', () => {
    expect(isDirectRun([], '/module.ts')).toBe(false);
  });

  test('returns false when argv names another module', () => {
    expect(isDirectRun(['node', '/other.ts'], '/module.ts')).toBe(false);
  });

  test('returns true when argv matches module path', () => {
    expect(isDirectRun(['node', '/module.ts'], '/module.ts')).toBe(true);
  });
});

describe('maybeRunChangesetReleaseCli', () => {
  test('runs cli when invoked directly', () => {
    const run = jest.fn();
    maybeRunChangesetReleaseCli(true, run);
    expect(run).toHaveBeenCalled();
  });

  test('skips cli when imported', () => {
    const run = jest.fn();
    maybeRunChangesetReleaseCli(false, run);
    expect(run).not.toHaveBeenCalled();
  });
});

describe('runChangesetReleaseCli', () => {
  test('publishes from a real workspace layout', () => {
    const root = mkdtempSync(join(tmpdir(), 'changeset-release-'));
    mkdirSync(join(root, 'packages', 'app'), {recursive: true});
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({name: 'eciperay', version: '1.33.0'}),
    );
    writeFileSync(
      join(root, 'packages', 'app', 'package.json'),
      JSON.stringify({name: '@eciperay/app', version: '1.34.0'}),
    );
    writeFileSync(
      join(root, 'package-lock.json'),
      JSON.stringify({version: '1.33.0', packages: {'': {version: '1.33.0'}}}),
    );
    writeFileSync(
      join(root, 'packages', 'app', 'CHANGELOG.md'),
      '## 1.34.0\n\n### Minor Changes\n\n- Entry\n',
    );
    const {calls, exec} = makeExec((_command, args) =>
      args[0] === 'diff' ? 'package.json\npackage-lock.json' : '',
    );
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    runChangesetReleaseCli(root, exec);
    const rootPkg = JSON.parse(
      readFileSync(join(root, 'package.json'), 'utf8'),
    );
    expect(rootPkg.version).toBe('1.34.0');
    expect(log).toHaveBeenCalledWith('Published v1.34.0.');
    expect(calls).toContainEqual(['git', 'tag', 'v1.34.0']);
    log.mockRestore();
  });
});

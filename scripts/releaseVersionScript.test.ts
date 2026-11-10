import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>;
};

// Regression test for the #416 fix on PR #420: changesets/action runs
// its version-script via @actions/exec without a shell, so the release
// version step must be ONE npm script whose own shell sequencing runs
// `changeset version` first and the package-lock sync second. If the
// sync is dropped or moved ahead of the version bump, regenerated
// release branches go back to shipping stale lockfile versions.
describe('release:version script', () => {
  test('runs changeset version before the lockfile sync', () => {
    const script = pkg.scripts?.['release:version'];
    expect(script).toBeDefined();
    const versionIndex = script?.indexOf('changeset version') ?? -1;
    const syncIndex = script?.indexOf('npm run sync:lockfile-versions') ?? -1;
    expect(versionIndex).toBeGreaterThanOrEqual(0);
    expect(syncIndex).toBeGreaterThan(versionIndex);
  });

  test('the sync script it calls exists', () => {
    expect(pkg.scripts?.['sync:lockfile-versions']).toContain(
      'syncPackageVersionsCli.ts',
    );
  });

  // Issue #474: the root version sync must run inside the version step
  // (after `changeset version` bumps the group, before the lockfile sync
  // reads the root manifest), because the publish step can no longer push
  // a root-version commit to master.
  test('runs the root-version sync after changeset version and before the lockfile sync', () => {
    const script = pkg.scripts?.['release:version'];
    const versionIndex = script?.indexOf('changeset version') ?? -1;
    const rootIndex = script?.indexOf('npm run sync:root-version') ?? -1;
    const syncIndex = script?.indexOf('npm run sync:lockfile-versions') ?? -1;
    expect(rootIndex).toBeGreaterThan(versionIndex);
    expect(syncIndex).toBeGreaterThan(rootIndex);
  });

  test('the root sync script it calls exists', () => {
    expect(pkg.scripts?.['sync:root-version']).toContain(
      'syncPackageVersionsCli.ts --sync-root',
    );
  });
});

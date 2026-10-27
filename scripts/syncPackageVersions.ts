import {readFileSync, writeFileSync} from 'node:fs';

export type SyncFs = {
  readFileSync: typeof readFileSync;
  writeFileSync: typeof writeFileSync;
};

// Stamps a version into a single package.json. This is the one piece of the
// old version-sync module the pending-release flow still uses: changesets
// versions the workspace packages itself, and scripts/changesetRelease.ts
// (the publish step) only needs to sync the workspace ROOT manifest to the
// group's version, because changesets never versions the root. The former
// sync-everything entry point — semantic-release's prepare step, which
// rewrote every manifest and the lockfile in one pass — was removed with
// the rest of the semantic-release remnants (issue #234).
export const setPackageJsonVersion = (
  filePath: string,
  version: string,
  fs: SyncFs,
): void => {
  const pkg = JSON.parse(fs.readFileSync(filePath, 'utf8')) as {
    version?: string;
  };
  pkg.version = version;
  fs.writeFileSync(filePath, `${JSON.stringify(pkg, null, 2)}\n`);
};

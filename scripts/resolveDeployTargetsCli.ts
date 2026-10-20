import {appendFileSync} from 'node:fs';
import {execSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

import {
  resolveDeployTargetsFromPaths,
  resolveDeployTargetsFromSubjects,
  writeGithubOutput,
} from './resolveDeployTargets.ts';

const TAG_PATTERN = /^v\d/u;

// Record separator printed before each commit subject so the parser can
// attribute every --name-only file list to the commit that touched it.
const RECORD_SEPARATOR = '\x1e';

const RELEASE_COMMIT_PREFIX = 'chore(release):';

/**
 * Collect the files changed between two release tags.
 *
 * Files are gathered per commit (not from the two trees' diff) so the automated
 * release commit can be excluded: it bumps the version field of every
 * package.json under packages/, which would otherwise mark every package as
 * changed on every release. Non-release commits that touch a package.json (e.g.
 * a dependency bump) still count.
 *
 * Two git log flags keep the per-commit lists complete:
 *
 * - --no-renames: with rename detection, a moved file is reported only at its
 *   destination, hiding that the source package lost a file.
 * - --diff-merges=first-parent: merge commits otherwise list no files, so an edit
 *   made while resolving a merge (or the changes the merge brings in) would be
 *   missed.
 */
export const getReleaseChangedPaths = (
  prevTag: string,
  newTag: string,
  exec: typeof execSync = execSync,
): string[] => {
  const range = `${prevTag}..${newTag}`;
  const output = exec(
    `git log ${range} --name-only --no-renames --diff-merges=first-parent --pretty=format:%x1e%s`,
    {encoding: 'utf8'},
  );

  return output.split(RECORD_SEPARATOR).flatMap(record => {
    const [subjectLine, ...fileLines] = record.split('\n');
    if (!subjectLine || subjectLine.startsWith(RELEASE_COMMIT_PREFIX)) {
      return [];
    }

    return fileLines.map(line => line.trim()).filter(Boolean);
  });
};

export const resolveDeployTargetsFromTags = (
  prevTag: string,
  newTag: string,
  exec: typeof execSync = execSync,
) => {
  // No previous tag means no baseline to diff against (first release):
  // deploy everything rather than risk silently skipping a target.
  if (!prevTag) {
    return {fly: true, android: true};
  }

  const paths = getReleaseChangedPaths(prevTag, newTag, exec);
  return resolveDeployTargetsFromPaths(paths);
};

export const isTagRangeArgv = (
  argv: string[],
): argv is [string, string, ...string[]] =>
  argv.length >= 2 &&
  typeof argv[0] === 'string' &&
  typeof argv[1] === 'string' &&
  TAG_PATTERN.test(argv[0]) &&
  TAG_PATTERN.test(argv[1]);

export const isDirectRun = (
  argv: string[] = process.argv,
  modulePath: string = fileURLToPath(import.meta.url),
): boolean => {
  const entry = argv[1];
  if (!entry) {
    return false;
  }
  return modulePath === entry;
};

export const runResolveDeployTargetsCli = (
  argv: string[] = process.argv.slice(2),
  exec: typeof execSync = execSync,
): void => {
  // release.yml only ever uses the tag-range / --first-release modes,
  // which resolve from the changed files. Passing raw commit subjects is
  // a manual fallback kept for ad-hoc checks.
  const firstReleaseIndex = argv.indexOf('--first-release');
  const targets =
    firstReleaseIndex === -1
      ? isTagRangeArgv(argv)
        ? resolveDeployTargetsFromTags(argv[0], argv[1], exec)
        : resolveDeployTargetsFromSubjects(
            argv.filter(arg => !arg.startsWith('--')),
          )
      : resolveDeployTargetsFromTags(
          '',
          argv[firstReleaseIndex + 1] ?? '',
          exec,
        );
  writeGithubOutput(targets, process.env['GITHUB_OUTPUT'], appendFileSync);
};

export const maybeRunResolveDeployTargetsCli = (
  directRun: boolean = isDirectRun(),
  run: () => void = runResolveDeployTargetsCli,
): void => {
  if (directRun) {
    run();
  }
};

maybeRunResolveDeployTargetsCli();

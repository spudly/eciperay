import {appendFileSync} from 'node:fs';
import {execSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

import {
  resolveDeployTargetsFromSubjects,
  writeGithubOutput,
} from './resolveDeployTargets.ts';

const TAG_PATTERN = /^v\d/u;

export const getReleaseCommitSubjects = (
  prevTag: string,
  newTag: string,
  exec: typeof execSync = execSync,
): string[] => {
  const range = prevTag ? `${prevTag}..${newTag}` : `${newTag}^`;
  const output = exec(`git log ${range} --pretty=format:%s`, {
    encoding: 'utf8',
  }).trim();
  if (!output) {
    return [];
  }
  return output.split('\n');
};

export const resolveDeployTargetsFromTags = (
  prevTag: string,
  newTag: string,
  exec: typeof execSync = execSync,
) => {
  const subjects = getReleaseCommitSubjects(prevTag, newTag, exec);
  return resolveDeployTargetsFromSubjects(subjects);
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

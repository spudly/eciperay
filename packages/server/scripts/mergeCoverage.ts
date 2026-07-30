import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

import libCoverage from 'istanbul-lib-coverage';
import libReport from 'istanbul-lib-report';
import reports from 'istanbul-reports';

type CoverageSummary = Record<
  string,
  {
    lines: {pct: number};
    branches: {pct: number};
    functions: {pct: number};
    statements: {pct: number};
  }
>;

const thresholds = {
  lines: 100,
  branches: 100,
  functions: 100,
  statements: 100,
} as const;

export const mergeServerCoverage = (coverageRoot: string): string[] => {
  const errors: string[] = [];
  const map = libCoverage.createCoverageMap({});

  for (const entry of readdirSync(coverageRoot, {withFileTypes: true})) {
    if (!entry.isDirectory()) {
      continue;
    }
    const coverageFile = join(coverageRoot, entry.name, 'coverage-final.json');
    if (!existsSync(coverageFile)) {
      continue;
    }
    map.merge(
      JSON.parse(readFileSync(coverageFile, 'utf8')) as libCoverage.CoverageMap,
    );
  }

  if (map.files().length === 0) {
    errors.push(
      'mergeCoverage: no coverage-final.json files found under coverage/*/',
    );
    return errors;
  }

  const mergedDir = join(coverageRoot, 'merged');
  const context = libReport.createContext({dir: mergedDir, coverageMap: map});

  reports.create('json-summary', {}).execute(context);
  reports.create('text-summary', {}).execute(context);

  const summary = JSON.parse(
    readFileSync(join(mergedDir, 'coverage-summary.json'), 'utf8'),
  ) as CoverageSummary;

  const total = summary['total'];
  if (!total) {
    errors.push('mergeCoverage: coverage summary missing total row');
    return errors;
  }

  for (const [key, min] of Object.entries(thresholds) as [
    keyof typeof thresholds,
    number,
  ][]) {
    if (total[key].pct < min) {
      errors.push(
        `Coverage threshold for ${key} (${min}%) not met: ${total[key].pct}%`,
      );
    }
  }

  return errors;
};

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

export const runMergeCoverageCli = (): void => {
  const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
  const errors = mergeServerCoverage(join(root, 'coverage'));
  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
};

export const maybeRunMergeCoverageCli = (
  directRun: boolean = isDirectRun(),
  run: () => void = runMergeCoverageCli,
): void => {
  if (directRun) {
    run();
  }
};

maybeRunMergeCoverageCli();

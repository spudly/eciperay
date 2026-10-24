import {fileURLToPath} from 'node:url';

import {builtinRules} from 'eslint/use-at-your-own-risk';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import nPlugin from 'eslint-plugin-n';
import importXPlugin from 'eslint-plugin-import-x';
import jestPlugin from 'eslint-plugin-jest';
import unicornPlugin from 'eslint-plugin-unicorn';
import eslintCommentsPlugin from '@eslint-community/eslint-plugin-eslint-comments';

type Plugin = {rules?: Record<string, unknown>};

// No 'react' or 'react-native' entries: eslint-plugin-react and
// eslint-plugin-react-native were removed by the @spudly/eslint-config
// adoption (neither has an ESLint 10 release). Their rule sets are owned
// by the shared package now — react via @eslint-react (pending in the
// package's reactPending export until it loads under TypeScript 7; see
// spudly/eslint-config#8) and react-native via the rules vendored into
// the package — and the package's own check-rules audit covers their
// explicit-configuration discipline.
export const PLUGINS: Record<string, Plugin> = {
  'react-hooks': reactHooksPlugin,
  'n': nPlugin,
  'import-x': importXPlugin,
  'jest': jestPlugin,
  'unicorn': unicornPlugin,
  'eslint-comments': eslintCommentsPlugin,
};

export const getConfiguredRules = async (): Promise<Set<string>> => {
  const {default: configs} = (await import('../eslint.config.ts')) as {
    default: {rules?: Record<string, unknown>}[];
  };
  const configured = new Set<string>();
  for (const config of configs) {
    for (const rule of Object.keys(config.rules ?? {})) {
      configured.add(rule);
    }
  }
  return configured;
};

// Deprecated rules are deliberately NOT audited: since the
// @spudly/eslint-config adoption, the shared package's currency policy
// removes deprecated rules from the config instead of carrying them as
// dead 'off' entries (the pre-adoption config listed them all). Only
// live rules must be explicitly configured.
export const isDeprecatedRule = (rule: unknown): boolean => {
  if (typeof rule !== 'object' || rule === null || !('meta' in rule)) {
    return false;
  }
  const meta = (rule as {meta?: unknown}).meta;
  if (typeof meta !== 'object' || meta === null || !('deprecated' in meta)) {
    return false;
  }
  return Boolean((meta as {deprecated?: unknown}).deprecated);
};

export const checkPluginRules = (
  configured: Set<string>,
  plugins: Record<string, Plugin> = PLUGINS,
): {plugin: string; unused: string[]}[] => {
  const results: {plugin: string; unused: string[]}[] = [];
  for (const [prefix, plugin] of Object.entries(plugins)) {
    const available = Object.entries(plugin.rules ?? {})
      .filter(([, rule]) => !isDeprecatedRule(rule))
      .map(([name]) => `${prefix}/${name}`);
    const unused = available.filter(r => !configured.has(r));
    results.push({plugin: prefix, unused});
  }
  return results;
};

export const checkCoreRules = (configured: Set<string>): string[] => {
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- builtinRules is the only stable way to enumerate all ESLint core rules; no public replacement exists in ESLint 9
  const available = [...builtinRules.entries()]
    .filter(([, rule]) => !isDeprecatedRule(rule))
    .map(([name]) => name);
  return available.filter(r => !configured.has(r));
};

export type LintUnusedRulesResult = {
  totalUnused: number;
  coreUnused: string[];
  pluginResults: {plugin: string; unused: string[]}[];
};

export const runLintUnusedRules = async (): Promise<LintUnusedRulesResult> => {
  const configured = await getConfiguredRules();
  const coreUnused = checkCoreRules(configured);
  const pluginResults = checkPluginRules(configured);
  const totalUnused =
    coreUnused.length +
    pluginResults.reduce((sum, {unused}) => sum + unused.length, 0);
  return {totalUnused, coreUnused, pluginResults};
};

export const printLintUnusedRulesReport = (
  result: LintUnusedRulesResult,
): number => {
  if (result.coreUnused.length > 0) {
    console.log(
      `\ncore ESLint: ${result.coreUnused.length} unconfigured rules`,
    );
    for (const rule of result.coreUnused) {
      console.log(`  ${rule}`);
    }
  }

  for (const {plugin, unused} of result.pluginResults) {
    if (unused.length > 0) {
      console.log(`\n${plugin}: ${unused.length} unconfigured rules`);
      for (const rule of unused) {
        console.log(`  ${rule}`);
      }
    }
  }

  if (result.totalUnused === 0) {
    console.log('\nAll rules (core + plugins) are explicitly configured.');
    return 0;
  }

  console.log(`\nTotal unconfigured rules: ${result.totalUnused}`);
  return 1;
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

export const runLintUnusedRulesCli = async (): Promise<void> => {
  const result = await runLintUnusedRules();
  process.exitCode = printLintUnusedRulesReport(result);
};

export const maybeRunLintUnusedRulesCli = async (
  directRun: boolean = isDirectRun(),
  run: () => Promise<void> = runLintUnusedRulesCli,
): Promise<void> => {
  if (directRun) {
    await run();
  }
};

await maybeRunLintUnusedRulesCli();

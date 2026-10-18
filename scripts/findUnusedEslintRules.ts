import {fileURLToPath} from 'node:url';

import {builtinRules} from 'eslint/use-at-your-own-risk';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactNativePlugin from 'eslint-plugin-react-native';
import nPlugin from 'eslint-plugin-n';
import importXPlugin from 'eslint-plugin-import-x';
import jestPlugin from 'eslint-plugin-jest';
import unicornPlugin from 'eslint-plugin-unicorn';
import eslintCommentsPlugin from '@eslint-community/eslint-plugin-eslint-comments';

type Plugin = {rules?: Record<string, unknown>};

export const PLUGINS: Record<string, Plugin> = {
  'react': reactPlugin,
  'react-hooks': reactHooksPlugin,
  'react-native': reactNativePlugin,
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

export const checkPluginRules = (
  configured: Set<string>,
  plugins: Record<string, Plugin> = PLUGINS,
): {plugin: string; unused: string[]}[] => {
  const results: {plugin: string; unused: string[]}[] = [];
  for (const [prefix, plugin] of Object.entries(plugins)) {
    const available = Object.keys(plugin.rules ?? {}).map(
      r => `${prefix}/${r}`,
    );
    const unused = available.filter(r => !configured.has(r));
    results.push({plugin: prefix, unused});
  }
  return results;
};

export const checkCoreRules = (configured: Set<string>): string[] => {
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- builtinRules is the only stable way to enumerate all ESLint core rules; no public replacement exists in ESLint 9
  const available = [...builtinRules.keys()];
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

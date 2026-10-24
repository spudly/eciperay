import {
  checkCoreRules,
  checkPluginRules,
  getConfiguredRules,
  isDeprecatedRule,
  printLintUnusedRulesReport,
  runLintUnusedRules,
} from './findUnusedEslintRules.ts';

describe('checkPluginRules', () => {
  it('returns unused plugin rules', () => {
    const configured = new Set(['jest/no-disabled-tests']);
    const results = checkPluginRules(configured);
    const jestResult = results.find(result => result.plugin === 'jest');
    expect(jestResult?.unused).toContain('jest/expect-expect');
    expect(jestResult?.unused).not.toContain('jest/no-disabled-tests');
  });

  it('handles plugins without rules', () => {
    const results = checkPluginRules(new Set(), {empty: {}});
    expect(results).toEqual([{plugin: 'empty', unused: []}]);
  });
});

describe('checkCoreRules', () => {
  it('returns unconfigured core rules', () => {
    const configured = new Set(['no-console']);
    const unused = checkCoreRules(configured);
    expect(unused).toContain('no-alert');
    expect(unused).not.toContain('no-console');
  });

  it('does not report deprecated core rules', () => {
    const unused = checkCoreRules(new Set());
    expect(unused).not.toContain('no-new-symbol');
    expect(unused).toContain('no-alert');
  });
});

describe('isDeprecatedRule', () => {
  it('returns false for non-object rules', () => {
    expect(isDeprecatedRule(undefined)).toBe(false);
    expect(isDeprecatedRule(null)).toBe(false);
    expect(isDeprecatedRule('rule')).toBe(false);
  });

  it('returns false when meta is missing or not an object', () => {
    expect(isDeprecatedRule({})).toBe(false);
    expect(isDeprecatedRule({meta: 'docs'})).toBe(false);
    expect(isDeprecatedRule({meta: null})).toBe(false);
  });

  it('returns false when deprecated is absent or falsy', () => {
    expect(isDeprecatedRule({meta: {}})).toBe(false);
    expect(isDeprecatedRule({meta: {deprecated: false}})).toBe(false);
  });

  it('returns true when deprecated is truthy', () => {
    expect(isDeprecatedRule({meta: {deprecated: true}})).toBe(true);
    expect(isDeprecatedRule({meta: {deprecated: {url: 'https://x'}}})).toBe(
      true,
    );
  });
});

describe('checkPluginRules deprecated filtering', () => {
  it('does not report deprecated plugin rules as unused', () => {
    const results = checkPluginRules(new Set(), {
      fake: {
        rules: {
          'old-rule': {meta: {deprecated: true}},
          'live-rule': {meta: {}},
        },
      },
    });
    expect(results).toEqual([{plugin: 'fake', unused: ['fake/live-rule']}]);
  });
});

describe('printLintUnusedRulesReport', () => {
  it('returns 0 when all rules are configured', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    expect(
      printLintUnusedRulesReport({
        totalUnused: 0,
        coreUnused: [],
        pluginResults: [],
      }),
    ).toBe(0);
    logSpy.mockRestore();
  });

  it('returns 1 and prints unused rules', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    expect(
      printLintUnusedRulesReport({
        totalUnused: 1,
        coreUnused: ['no-alert'],
        pluginResults: [],
      }),
    ).toBe(1);
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('prints unused plugin rules', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    expect(
      printLintUnusedRulesReport({
        totalUnused: 2,
        coreUnused: [],
        pluginResults: [{plugin: 'jest', unused: ['jest/expect-expect']}],
      }),
    ).toBe(1);
    expect(logSpy).toHaveBeenCalledWith('\njest: 1 unconfigured rules');
    logSpy.mockRestore();
  });
});

describe('getConfiguredRules', () => {
  it('loads rules from eslint config', async () => {
    const configured = await getConfiguredRules();
    expect(configured.has('no-console')).toBe(true);
  });
});

describe('runLintUnusedRules', () => {
  it('returns structured unused rule counts', async () => {
    const result = await runLintUnusedRules();
    expect(result.totalUnused).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.coreUnused)).toBe(true);
    expect(Array.isArray(result.pluginResults)).toBe(true);
  });
});

describe('isDirectRun', () => {
  it('detects direct execution from argv', async () => {
    const {isDirectRun} = await import('./findUnusedEslintRules.ts');
    expect(
      isDirectRun(
        ['node', '/repo/scripts/findUnusedEslintRules.ts'],
        '/repo/scripts/findUnusedEslintRules.ts',
      ),
    ).toBe(true);
    expect(isDirectRun([], '/repo/scripts/findUnusedEslintRules.ts')).toBe(
      false,
    );
  });
});

describe('runLintUnusedRulesCli', () => {
  it('sets exit code from report', async () => {
    const {runLintUnusedRulesCli} = await import('./findUnusedEslintRules.ts');
    await runLintUnusedRulesCli();
    expect(process.exitCode).toBeDefined();
    process.exitCode = undefined;
  });
});

describe('maybeRunLintUnusedRulesCli', () => {
  it('skips cli when not a direct run', async () => {
    const {maybeRunLintUnusedRulesCli} =
      await import('./findUnusedEslintRules.ts');
    await expect(maybeRunLintUnusedRulesCli(false)).resolves.toBeUndefined();
  });

  it('runs cli when direct run is true', async () => {
    const {maybeRunLintUnusedRulesCli} =
      await import('./findUnusedEslintRules.ts');
    const run = jest.fn().mockResolvedValue();
    await maybeRunLintUnusedRulesCli(true, run);
    expect(run).toHaveBeenCalled();
  });
});

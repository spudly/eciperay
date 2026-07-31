import {join} from 'node:path';

import {
  isDirectRun,
  listChangedFiles,
  maybeRunCheckMirrorPairsCli,
  runCheckMirrorPairsCli,
} from './checkMirrorPairsCli.ts';

describe('listChangedFiles', () => {
  test('merges tracked and untracked git paths', () => {
    const exec = jest.fn((command: string) => {
      if (command.startsWith('git diff')) {
        return 'packages/app/src/components/LegalLinks.tsx\n';
      }
      return 'packages/web/src/components/LegalLinks.tsx\n';
    });

    expect(listChangedFiles('/repo', exec as never)).toEqual([
      'packages/app/src/components/LegalLinks.tsx',
      'packages/web/src/components/LegalLinks.tsx',
    ]);
  });

  test('returns an empty list when git output is blank', () => {
    const exec = jest.fn().mockReturnValue('');

    expect(listChangedFiles('/repo', exec as never)).toEqual([]);
  });
});

describe('runCheckMirrorPairsCli', () => {
  test('logs success when the registry is valid', () => {
    const root = join(import.meta.dirname, '..');
    const log = {error: jest.fn(), log: jest.fn()};
    const exit = jest.fn();

    runCheckMirrorPairsCli(root, {
      exec: jest.fn().mockReturnValue('') as never,
      check: () => [],
      log,
      exit,
    });

    expect(log.log).toHaveBeenCalledWith('UI parity registry check passed.');
    expect(exit).not.toHaveBeenCalled();
  });

  test('uses default check and git commands when optional deps are omitted', () => {
    const root = join(import.meta.dirname, '..');
    const log = {error: jest.fn(), log: jest.fn()};

    runCheckMirrorPairsCli(root, {log, exit: jest.fn()});

    expect(log.log).toHaveBeenCalledWith('UI parity registry check passed.');
  });

  test('exits with errors when validation fails', () => {
    const log = {error: jest.fn(), log: jest.fn()};
    const exit = jest.fn();

    runCheckMirrorPairsCli('/repo', {
      exec: jest.fn().mockReturnValue('') as never,
      check: () => ['broken'],
      log,
      exit,
    });

    expect(log.error).toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(1);
  });

  test('uses process.exit when exit dep is omitted and validation fails', () => {
    const exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((() => {}) as never);
    const root = join(import.meta.dirname, '..');

    runCheckMirrorPairsCli(root, {
      exec: jest.fn().mockReturnValue('') as never,
      check: () => ['broken'],
      log: {error: jest.fn(), log: jest.fn()},
    });

    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});

describe('isDirectRun', () => {
  test('detects direct execution from argv', () => {
    expect(
      isDirectRun(
        ['node', '/repo/scripts/checkMirrorPairsCli.ts'],
        '/repo/scripts/checkMirrorPairsCli.ts',
      ),
    ).toBe(true);
    expect(
      isDirectRun(
        ['node', '/repo/scripts/other.ts'],
        '/repo/scripts/checkMirrorPairsCli.ts',
      ),
    ).toBe(false);
    expect(isDirectRun([], '/repo/scripts/checkMirrorPairsCli.ts')).toBe(false);
  });
});

describe('maybeRunCheckMirrorPairsCli', () => {
  test('runs only when invoked directly', () => {
    const run = jest.fn();

    maybeRunCheckMirrorPairsCli(false, run);
    maybeRunCheckMirrorPairsCli(true, run);

    expect(run).toHaveBeenCalledTimes(1);
  });

  test('runs the default CLI entrypoint when invoked directly', () => {
    expect(() => {
      maybeRunCheckMirrorPairsCli(true);
    }).not.toThrow();
  });
});

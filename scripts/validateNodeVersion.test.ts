import {
  extractMajor,
  runValidateNodeVersion,
  validateNodeVersionConstraints,
  type ValidateFs,
} from './validateNodeVersion.ts';

const makeFs = (overrides: Partial<ValidateFs> = {}): ValidateFs => ({
  readFileSync: jest.fn(),
  readdirSync: jest.fn().mockReturnValue([]),
  ...overrides,
});

describe('extractMajor', () => {
  it('extracts the major version from constraints', () => {
    expect(extractMajor('>= 22.0.0')).toBe('22');
    expect(extractMajor('22')).toBe('22');
    expect(extractMajor('')).toBe('');
  });
});

describe('validateNodeVersionConstraints', () => {
  it('fails when root engines.node is missing', () => {
    const fs = makeFs({
      readFileSync: jest.fn().mockReturnValue(JSON.stringify({})),
    });
    const result = validateNodeVersionConstraints('/repo', fs);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('no engines.node');
  });

  it('passes when all constraints match', () => {
    const fs = makeFs({
      readFileSync: jest.fn((path: string) => {
        if (path.endsWith('package.json')) {
          return JSON.stringify({engines: {node: '>= 22.0.0'}});
        }
        if (path.endsWith('.nvmrc')) {
          return '22\n';
        }
        if (path.endsWith('ci.yml')) {
          return "node-version: '22'";
        }
        return '';
      }),
      readdirSync: jest
        .fn()
        .mockReturnValue([{isDirectory: () => true, name: 'client'}]),
    });

    const result = validateNodeVersionConstraints('/repo', fs);
    expect(result).toEqual({ok: true, errors: [], rootEngine: '22'});
  });

  it('reports nvmrc mismatches', () => {
    const fs = makeFs({
      readFileSync: jest.fn((path: string) => {
        if (path === '/repo/package.json') {
          return JSON.stringify({engines: {node: '>= 22.0.0'}});
        }
        if (path.endsWith('.nvmrc')) {
          return '20';
        }
        if (path.endsWith('ci.yml')) {
          return 'node-version: 22';
        }
        return JSON.stringify({engines: {node: '>= 22.0.0'}});
      }),
      readdirSync: jest.fn().mockReturnValue([]),
    });

    const result = validateNodeVersionConstraints('/repo', fs);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('.nvmrc');
  });

  it('reports ci.yml mismatches', () => {
    const fs = makeFs({
      readFileSync: jest.fn((path: string) => {
        if (path === '/repo/package.json') {
          return JSON.stringify({engines: {node: '>= 22.0.0'}});
        }
        if (path.endsWith('.nvmrc')) {
          return '22';
        }
        if (path.endsWith('ci.yml')) {
          return 'no node version here';
        }
        return JSON.stringify({engines: {node: '>= 22.0.0'}});
      }),
      readdirSync: jest.fn().mockReturnValue([]),
    });

    const result = validateNodeVersionConstraints('/repo', fs);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('ci.yml');
  });
});

describe('isDirectRun', () => {
  it('detects direct execution from argv', async () => {
    const {isDirectRun} = await import('./validateNodeVersion.ts');
    expect(
      isDirectRun(
        ['node', '/repo/scripts/validateNodeVersion.ts'],
        '/repo/scripts/validateNodeVersion.ts',
      ),
    ).toBe(true);
    expect(isDirectRun(['node'], '/repo/scripts/validateNodeVersion.ts')).toBe(
      false,
    );
  });
});

describe('runValidateNodeVersionCli', () => {
  it('exits with validation status', async () => {
    const exit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    const {runValidateNodeVersionCli} =
      await import('./validateNodeVersion.ts');
    expect(() => runValidateNodeVersionCli()).toThrow('exit');
    expect(console.log).toHaveBeenCalledWith(
      expect.stringMatching(
        /^OK: all engines\.node constraints, \.nvmrc, and ci\.yml agree on Node \d+$/,
      ),
    );
    exit.mockRestore();
  });
});

describe('maybeRunValidateNodeVersionCli', () => {
  it('skips cli when not a direct run', async () => {
    const {maybeRunValidateNodeVersionCli} =
      await import('./validateNodeVersion.ts');
    expect(() => {
      maybeRunValidateNodeVersionCli(false);
    }).not.toThrow();
  });

  it('runs cli when direct run is true', async () => {
    const {maybeRunValidateNodeVersionCli} =
      await import('./validateNodeVersion.ts');
    const run = jest.fn();
    maybeRunValidateNodeVersionCli(true, run);
    expect(run).toHaveBeenCalled();
  });
});

describe('runValidateNodeVersion', () => {
  it('returns 0 on success', () => {
    const fs = makeFs({
      readFileSync: jest.fn((path: string) => {
        if (path.endsWith('package.json')) {
          return JSON.stringify({engines: {node: '>= 22.0.0'}});
        }
        if (path.endsWith('.nvmrc')) {
          return '22';
        }
        if (path.endsWith('ci.yml')) {
          return 'node-version: 22';
        }
        return '';
      }),
      readdirSync: jest.fn().mockReturnValue([]),
    });
    expect(runValidateNodeVersion('/repo', fs)).toBe(0);
    expect(console.log).toHaveBeenCalledWith(
      'OK: all engines.node constraints, .nvmrc, and ci.yml agree on Node 22',
    );
  });

  it('returns 1 on failure', () => {
    const stderrSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const fs = makeFs({
      readFileSync: jest.fn().mockReturnValue(JSON.stringify({})),
    });
    expect(runValidateNodeVersion('/repo', fs)).toBe(1);
    stderrSpy.mockRestore();
  });

  it('reports package mismatches', () => {
    const fs = makeFs({
      readFileSync: jest.fn((path: string) => {
        if (path === '/repo/package.json') {
          return JSON.stringify({engines: {node: '>= 22.0.0'}});
        }
        if (path === '/repo/packages/client/package.json') {
          return JSON.stringify({engines: {node: '>= 20.0.0'}});
        }
        if (path.endsWith('.nvmrc')) {
          return '22';
        }
        if (path.endsWith('ci.yml')) {
          return 'node-version: 22';
        }
        return JSON.stringify({engines: {node: '>= 22.0.0'}});
      }),
      readdirSync: jest
        .fn()
        .mockReturnValue([{isDirectory: () => true, name: 'client'}]),
    });

    const result = validateNodeVersionConstraints('/repo', fs);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('packages/client/package.json');
  });

  it('treats missing package engines as empty', () => {
    const fs = makeFs({
      readFileSync: jest.fn((path: string) => {
        if (path === '/repo/package.json') {
          return JSON.stringify({engines: {node: '>= 22.0.0'}});
        }
        if (path === '/repo/packages/client/package.json') {
          return JSON.stringify({});
        }
        if (path.endsWith('.nvmrc')) {
          return '22';
        }
        if (path.endsWith('ci.yml')) {
          return 'node-version: 22';
        }
        return '';
      }),
      readdirSync: jest
        .fn()
        .mockReturnValue([{isDirectory: () => true, name: 'client'}]),
    });

    const result = validateNodeVersionConstraints('/repo', fs);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('packages/client/package.json');
  });
});

import {freePorts, parsePortArgs, runFreeDevPortsCli} from './freeDevPorts.ts';

describe('parsePortArgs', () => {
  it('parses positive port numbers from argv', () => {
    expect(parsePortArgs(['node', 'script', '8080', '0', 'bad'])).toEqual([
      8080,
    ]);
  });
});

describe('freePorts', () => {
  it('does nothing when no ports are provided', () => {
    const exec = jest.fn();
    freePorts([], exec);
    expect(exec).not.toHaveBeenCalled();
  });

  it('kills processes listening on a port', () => {
    const exec = jest.fn().mockReturnValueOnce('123\n').mockReturnValueOnce('');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    freePorts([8080], exec);
    expect(exec).toHaveBeenCalledWith('lsof -ti tcp:8080', expect.any(Object));
    expect(exec).toHaveBeenCalledWith('kill -9 123', {stdio: 'ignore'});
    logSpy.mockRestore();
  });

  it('ignores errors when the port is already free', () => {
    const exec = jest.fn().mockImplementation(() => {
      throw new Error('no process');
    });
    expect(() => {
      freePorts([8080], exec);
    }).not.toThrow();
  });
});

describe('isDirectRun', () => {
  it('detects direct execution from argv', async () => {
    const {isDirectRun} = await import('./freeDevPorts.ts');
    expect(
      isDirectRun(
        ['node', '/repo/scripts/freeDevPorts.ts'],
        '/repo/scripts/freeDevPorts.ts',
      ),
    ).toBe(true);
    expect(isDirectRun([], '/repo/scripts/freeDevPorts.ts')).toBe(false);
  });
});

describe('runFreeDevPortsCli', () => {
  it('runs cli with parsed ports', () => {
    const exec = jest.fn().mockImplementation(() => {
      throw new Error('no process');
    });
    expect(() => {
      runFreeDevPortsCli(['node', 'freeDevPorts.ts', '8080'], exec);
    }).not.toThrow();
  });
});

describe('maybeRunFreeDevPortsCli', () => {
  it('skips cli when not a direct run', async () => {
    const {maybeRunFreeDevPortsCli} = await import('./freeDevPorts.ts');
    expect(() => {
      maybeRunFreeDevPortsCli(false);
    }).not.toThrow();
  });

  it('runs cli when direct run is true', async () => {
    const {maybeRunFreeDevPortsCli} = await import('./freeDevPorts.ts');
    const run = jest.fn();
    maybeRunFreeDevPortsCli(true, run);
    expect(run).toHaveBeenCalled();
  });
});

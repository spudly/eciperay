const {
  formatConsoleArgs,
  installFailOnConsoleError,
  installSilenceConsoleLog,
} = require('./failOnConsoleError.cjs');

describe('formatConsoleArgs', () => {
  it('formats string arguments', () => {
    expect(formatConsoleArgs(['hello', 'world'])).toBe('hello world');
  });

  it('formats Error instances', () => {
    const error = new Error('boom');
    expect(formatConsoleArgs([error])).toContain('boom');
  });

  it('formats Error without stack', () => {
    const error = new Error('boom');
    error.stack = undefined;
    expect(formatConsoleArgs([error])).toBe('boom');
  });

  it('formats JSON-serializable values', () => {
    expect(formatConsoleArgs([{a: 1}])).toBe('{"a":1}');
  });

  it('falls back when JSON.stringify fails', () => {
    const circular = {};
    circular.self = circular;
    expect(formatConsoleArgs([circular])).toBe('[object Object]');
  });
});

describe('installFailOnConsoleError', () => {
  it('requires Jest setup hooks', () => {
    const savedBeforeEach = global.beforeEach;
    const savedAfterEach = global.afterEach;
    global.beforeEach = undefined;
    global.afterEach = undefined;
    expect(() => {
      installFailOnConsoleError();
    }).toThrow('installFailOnConsoleError must run from Jest/Vitest setupFilesAfterEnv');
    global.beforeEach = savedBeforeEach;
    global.afterEach = savedAfterEach;
  });

  it('reports captured console.error calls after each test', () => {
    const stderrSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const savedBeforeEach = global.beforeEach;
    const savedAfterEach = global.afterEach;
    const hooks = {beforeEach: [], afterEach: []};
    global.beforeEach = fn => {
      hooks.beforeEach.push(fn);
    };
    global.afterEach = fn => {
      hooks.afterEach.push(fn);
    };

    installFailOnConsoleError();
    hooks.beforeEach.forEach(fn => {
      fn();
    });
    console.error('bad');
    expect(() => {
      hooks.afterEach.forEach(fn => {
        fn();
      });
    }).toThrow('console.error was called during');

    global.beforeEach = savedBeforeEach;
    global.afterEach = savedAfterEach;
    stderrSpy.mockRestore();
  });

  it('uses an unknown test name when expect state is missing', () => {
    const stderrSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const savedBeforeEach = global.beforeEach;
    const savedAfterEach = global.afterEach;
    const savedGetState = expect.getState;
    const hooks = {beforeEach: [], afterEach: []};
    global.beforeEach = fn => {
      hooks.beforeEach.push(fn);
    };
    global.afterEach = fn => {
      hooks.afterEach.push(fn);
    };
    expect.getState = () => ({});

    installFailOnConsoleError();
    hooks.beforeEach.forEach(fn => {
      fn();
    });
    console.error('bad');
    expect(() => {
      hooks.afterEach.forEach(fn => {
        fn();
      });
    }).toThrow('"(unknown test)"');

    global.beforeEach = savedBeforeEach;
    global.afterEach = savedAfterEach;
    expect.getState = savedGetState;
    stderrSpy.mockRestore();
  });
});

describe('installSilenceConsoleLog', () => {
  it('requires Jest beforeEach', () => {
    const savedBeforeEach = global.beforeEach;
    global.beforeEach = undefined;
    expect(() => {
      installSilenceConsoleLog();
    }).toThrow('installSilenceConsoleLog must run from Jest/Vitest setupFilesAfterEnv');
    global.beforeEach = savedBeforeEach;
  });
});

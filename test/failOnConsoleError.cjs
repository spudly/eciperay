/**
 * Fail the current test when console.error is called.
 * Works with Jest and Vitest (globals: true).
 */

const formatConsoleArgs = args =>
  args
    .map(arg => {
      if (typeof arg === 'string') {
        return arg;
      }
      if (arg instanceof Error) {
        return arg.stack ?? arg.message;
      }
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(' ');

const installFailOnConsoleError = () => {
  if (typeof beforeEach !== 'function' || typeof afterEach !== 'function') {
    throw new Error(
      'installFailOnConsoleError must run from Jest/Vitest setupFilesAfterEnv',
    );
  }
  const originalConsoleError = console.error;
  /** @type {unknown[][]} */
  const errors = [];

  // Patterns for React act() warnings that are benign with Tamagui components
  // (they trigger async state updates that are hard to wrap in tests).
  const ignoredPatterns = [
    /not wrapped in act\(\.\.\.\)/,
    /overlapping act\(\) calls/,
  ];

  const shouldIgnore = args => {
    const text = formatConsoleArgs(args);
    return ignoredPatterns.some(pattern => pattern.test(text));
  };

  beforeEach(() => {
    errors.length = 0;
    console.error = (...args) => {
      if (!shouldIgnore(args)) {
        errors.push(args);
      }
      originalConsoleError.apply(console, args);
    };
  });

  afterEach(() => {
    console.error = originalConsoleError;
    if (errors.length === 0) {
      return;
    }
    const testName = expect.getState().currentTestName ?? '(unknown test)';
    const details = errors
      .map((args, index) => `  [${index + 1}] ${formatConsoleArgs(args)}`)
      .join('\n');
    throw new Error(
      `console.error was called during "${testName}":\n${details}`,
    );
  });
};

const installSilenceConsoleLog = () => {
  if (typeof beforeEach !== 'function') {
    throw new Error(
      'installSilenceConsoleLog must run from Jest/Vitest setupFilesAfterEnv',
    );
  }

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
};

module.exports = {
  formatConsoleArgs,
  installFailOnConsoleError,
  installSilenceConsoleLog,
};

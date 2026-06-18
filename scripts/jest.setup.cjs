const {
  installFailOnConsoleError,
  installSilenceConsoleLog,
} = require('../test/failOnConsoleError.cjs');
const jestGlobals = require('@jest/globals');

globalThis.jest = jestGlobals.jest;

installFailOnConsoleError();
installSilenceConsoleLog();

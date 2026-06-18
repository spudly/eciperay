const {
  installFailOnConsoleError,
  installSilenceConsoleLog,
} = require('./failOnConsoleError.cjs');
const jestGlobals = require('@jest/globals');

globalThis.jest = jestGlobals.jest;

installFailOnConsoleError();
installSilenceConsoleLog();

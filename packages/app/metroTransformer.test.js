/* global __dirname -- CJS test file: __dirname is a Node runtime global that the jest eslint env does not declare */
// Regression tests for the app's Metro transformer (metroTransformer.cjs).
//
// The transformer #588 originally wired in (@lingui/metro-transformer's
// bundled entries) delegated to a babel transformer resolved from the
// monorepo root's older React Native toolchain, which cannot parse Flow
// syntax in this app's react-native version and broke the Android
// release bundle. These tests exercise the configured transformer
// entrypoint directly: the Flow fixture below mirrors the construct
// that failed (a variance-annotated Flow interface property, as in
// react-native's Libraries/vendor/emitter/EventEmitter.js), and the
// catalog check proves .po files still compile through this entrypoint
// (the Jest catalog tests use jestPoTransformer.cjs instead and do not
// cover this implementation).
//
// The checks run in a child Node process: Metro loads its transformer
// with a plain require in a worker process, while Jest's sandboxed
// module registry cannot load the transformer's ESM-only Lingui
// dependencies (the same constraint jestPoCacheKey.cjs documents).
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');

const execFileAsync = promisify(execFile);

const flowFixture = `/**
 * @flow
 */

'use strict';

interface Registration<TArgs> {
  +context: unknown;
  +listener: (...args: TArgs) => unknown;
  +remove: () => void;
}

class Subscription {
  context: unknown;
  listener: () => void;

  constructor(context: unknown, listener: () => void) {
    this.context = context;
    this.listener = listener;
  }
}

module.exports = Subscription;
`;

// Runs in plain Node (see header): loads the transformer the way Metro
// does and reports the outcomes as JSON on stdout.
const runnerSource = `
const fs = require('node:fs');
const path = require('node:path');

const appRoot = process.argv[1];

const options = {
  dev: false,
  enableBabelRCLookup: true,
  experimentalImportSupport: false,
  hermesParser: false,
  hot: false,
  inlineRequires: false,
  minify: false,
  platform: 'android',
  projectRoot: appRoot,
  retainLines: false,
  unstable_transformProfile: 'default',
};

(async () => {
  // Load the transformer through the Metro configuration, exactly as
  // Metro resolves it at bundle time: reverting the babelTransformerPath
  // wiring in metro.config.cjs must fail this test, not just reverting
  // the transformer file itself.
  const metroConfig = await Promise.resolve(
    require(path.join(appRoot, 'metro.config.cjs')),
  );
  const transformer = require(metroConfig.transformer.babelTransformerPath);

  const flow = await transformer.transform({
    filename: path.join(appRoot, 'src', 'metroTransformerFixture.js'),
    options,
    plugins: [],
    src: ${JSON.stringify(flowFixture)},
  });

  const catalogPath = path.join(
    appRoot,
    'src',
    'i18n',
    'locales',
    'en-US',
    'messages.po',
  );
  const catalog = await transformer.transform({
    filename: catalogPath,
    options,
    plugins: [],
    src: fs.readFileSync(catalogPath, 'utf8'),
  });

  // The shared core catalog (#681) lives in @eciperay/client, outside
  // this package: home.title moved there from the app catalog, and the
  // transformer must compile that file too (it is registered in
  // lingui.config.ts alongside the host catalog).
  const coreCatalogPath = path.join(
    appRoot,
    '..',
    'client',
    'src',
    'i18n',
    'locales',
    'en-US',
    'messages.po',
  );
  const coreCatalog = await transformer.transform({
    filename: coreCatalogPath,
    options,
    plugins: [],
    src: fs.readFileSync(coreCatalogPath, 'utf8'),
  });

  console.log(
    JSON.stringify({
      flowBodyLength: flow.ast?.program.body.length ?? 0,
      // forgotPassword.confirmationTitle, a host-only string that stayed
      // in the app's en-US catalog after the #681 split.
      catalogHasHostString: JSON.stringify(catalog.ast).includes(
        'Check your email',
      ),
      catalogHasHomeTitle: JSON.stringify(coreCatalog.ast).includes(
        'Welcome to Eciperay',
      ),
      cacheKey: transformer.getCacheKey({projectRoot: appRoot}),
      linguiCliVersion: (() => {
        let dir = path.dirname(
          require.resolve('@lingui/cli/api', {paths: [appRoot]}),
        );
        for (let depth = 0; depth < 6; depth++) {
          const candidate = path.join(dir, 'package.json');
          if (fs.existsSync(candidate)) {
            const pkg = JSON.parse(fs.readFileSync(candidate, 'utf8'));
            if (pkg.name === '@lingui/cli') {
              return pkg.version;
            }
          }
          dir = path.dirname(dir);
        }
        return 'unknown';
      })(),
    }),
  );
})().catch(error => {
  console.error(error);
  process.exit(1);
});
`;

describe('metroTransformer', () => {
  it('transforms Flow syntax and compiles catalogs in a plain Node process', async () => {
    const {stdout} = await execFileAsync(
      process.execPath,
      ['-e', runnerSource, __dirname],
      {cwd: __dirname, maxBuffer: 16_777_216},
    );
    const result = JSON.parse(stdout.trim().split('\n').at(-1));
    expect(result.flowBodyLength).toBeGreaterThan(0);
    // A host-only string from the app's en-US catalog, compiled on the fly.
    expect(result.catalogHasHostString).toBe(true);
    // home.title from the shared core en-US catalog (#681), compiled on
    // the fly from @eciperay/client.
    expect(result.catalogHasHomeTitle).toBe(true);
    // A Lingui compiler upgrade must change the cache key.
    expect(result.cacheKey).toContain(`lingui-cli:${result.linguiCliVersion}`);
  }, 120_000);
});

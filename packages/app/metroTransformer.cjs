// Metro transformer for the app: compiles Lingui .po catalogs on the
// fly (#588) and delegates everything else to the React Native babel
// transformer.
//
// This composition lives in the package instead of using
// @lingui/metro-transformer because that package is hoisted to the
// monorepo root, so its internal require of the upstream babel
// transformer resolves to the root's older React Native toolchain
// (metro-babel-transformer 0.85.3 / hermes-parser 0.33.3) instead of
// this app's React Native 0.88 copies. The older toolchain cannot parse
// Flow syntax in react-native 0.88's own sources (e.g. `readonly` class
// properties in Libraries/vendor/emitter/EventEmitter.js), which broke
// the Android release bundle. Requiring the upstream transformer from
// this file resolves the app's own copy, and the .po compilation below
// mirrors @lingui/metro-transformer's, using the same @lingui/cli
// catalog API. The Jest equivalent is jestPoTransformer.cjs.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const upstreamTransformer = require('@react-native/metro-babel-transformer');
const {getConfig} = require('@lingui/conf');
const {
  createCompiledCatalog,
  getCatalogForFile,
  getCatalogs,
} = require('@lingui/cli/api');

let catalogListPromise = null;
const loadCatalogList = () => {
  catalogListPromise ??= (async () => {
    const config = getConfig();
    const allCatalogs = await getCatalogs(config);
    return {allCatalogs, config};
  })();
  return catalogListPromise;
};

const compilePoFile = async ({filename}) => {
  const {allCatalogs, config} = await loadCatalogList();
  const catalogPathRelativeToLinguiConfig = path.relative(
    config.rootDir,
    filename,
  );
  const catalogFile = getCatalogForFile(
    catalogPathRelativeToLinguiConfig,
    allCatalogs,
  );
  if (!catalogFile) {
    throw new Error(
      `Requested resource ${filename} is not matched to any of your ` +
        'catalogs paths specified in "lingui.config".\n\n' +
        `Your catalogs:\n${config.catalogs.map(c => c.path).join('\n')}\n\n` +
        'Please check that `catalogs.path` is filled properly and restart ' +
        'the Metro server.',
    );
  }
  const {catalog, locale} = catalogFile;
  const {messages} = await catalog.getTranslations(locale, {
    fallbackLocales: config.fallbackLocales,
    sourceLocale: config.sourceLocale,
  });
  const pseudoLocaleConfig = config.pseudoLocale.find(
    item => item.locale === locale,
  );
  const {source} = createCompiledCatalog(locale, messages, {
    strict: process.env.NODE_ENV !== 'production',
    namespace: 'es',
    pseudoLocale: pseudoLocaleConfig?.locale,
    pseudoLocaleOptions: pseudoLocaleConfig?.options,
  });
  return source;
};

// A compiled catalog resolves messages through the fallback and source
// locales, so its output can depend on every catalog in the locales
// tree; hash them all into the cache key (same approach as
// jestPoCacheKey.cjs).
const catalogsHash = projectRoot => {
  const localesDir = path.join(
    projectRoot ?? __dirname,
    'src',
    'i18n',
    'locales',
  );
  const hash = crypto.createHash('sha256');
  if (fs.existsSync(localesDir)) {
    for (const locale of fs.readdirSync(localesDir).sort()) {
      const catalogPath = path.join(localesDir, locale, 'messages.po');
      if (fs.existsSync(catalogPath)) {
        hash.update(fs.readFileSync(catalogPath, 'utf8'));
      }
    }
  }
  return hash.digest('hex');
};

module.exports = {
  transform: async params => {
    if (!params.filename.endsWith('.po')) {
      return upstreamTransformer.transform(params);
    }
    const src = await compilePoFile(params);
    return upstreamTransformer.transform({...params, src});
  },
  getCacheKey: options =>
    `${upstreamTransformer.getCacheKey?.(options) ?? ''}` +
    `$lingui-po:${catalogsHash(options?.projectRoot)}`,
};

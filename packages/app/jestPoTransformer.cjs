// Jest transformer for Lingui .po catalogs (#588).
//
// At runtime the catalogs are compiled on the fly by
// @lingui/metro-transformer, but Jest transforms modules with babel-jest,
// which cannot load a .po import. This transformer compiles the catalog
// through the exact same @lingui/cli API the Metro transformer uses
// (getCatalogs -> getTranslations -> createCompiledCatalog), so tests run
// against the real catalog content — no stubbed or copied strings.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const {getConfig} = require('@lingui/conf');
const api = require('@lingui/cli/api');

// One catalog load per transformer process; the catalogs are tiny.
const catalogsByRoot = new Map();
const loadCatalogs = rootDir => {
  let pending = catalogsByRoot.get(rootDir);
  if (!pending) {
    pending = (async () => {
      const config = getConfig({cwd: rootDir});
      return {config, allCatalogs: await api.getCatalogs(config)};
    })();
    catalogsByRoot.set(rootDir, pending);
  }
  return pending;
};

const compilePoFile = async (sourcePath, rootDir) => {
  const {config, allCatalogs} = await loadCatalogs(rootDir);
  const relativePath = path
    .relative(rootDir, sourcePath)
    .split(path.sep)
    .join('/');
  const catalogFile = api.getCatalogForFile(relativePath, allCatalogs);
  if (!catalogFile) {
    throw new Error(
      `jestPoTransformer: ${relativePath} is not matched by any catalog path in lingui.config`,
    );
  }
  const {locale, catalog} = catalogFile;
  const {messages} = await catalog.getTranslations(locale, {
    fallbackLocales: config.fallbackLocales,
    sourceLocale: config.sourceLocale,
  });
  const {source, errors} = api.createCompiledCatalog(locale, messages, {
    strict: false,
    namespace: 'cjs',
  });
  if (errors.length > 0) {
    throw new Error(
      `jestPoTransformer: failed to compile ${relativePath}: ${errors
        .map(({id, error}) => `${id}: ${error.message}`)
        .join('; ')}`,
    );
  }
  return source;
};

module.exports = {
  processAsync: async (sourceText, sourcePath, options) => ({
    code: await compilePoFile(sourcePath, options.config.rootDir),
  }),
  // Fallback locales mean one catalog's output can depend on another
  // locale's .po, so the cache key covers every .po in the locales tree
  // plus this transformer's own source.
  getCacheKey: (sourceText, sourcePath, options) => {
    const hash = crypto.createHash('sha256');
    hash.update(sourceText);
    hash.update(fs.readFileSync(__filename, 'utf8'));
    const localesDir = path.join(options.config.rootDir, 'src/i18n/locales');
    for (const locale of fs.readdirSync(localesDir).sort()) {
      const poPath = path.join(localesDir, locale, 'messages.po');
      if (fs.existsSync(poPath)) {
        hash.update(fs.readFileSync(poPath, 'utf8'));
      }
    }
    return hash.digest('hex');
  },
};

// Jest transformer for Lingui .po catalogs (#588).
//
// At runtime the catalogs are compiled on the fly by
// @lingui/metro-transformer, but Jest transforms modules with babel-jest,
// which cannot load a .po import — and Jest requires a synchronous
// `process` export here, so the async @lingui/cli catalog API cannot be
// used. This transformer therefore compiles synchronously with the same
// pieces the CLI compile path uses: @lingui/format-po to parse the .po
// file and @lingui/cli's createCompiledCatalog to compile the messages,
// so tests run against the real catalog content — no stubbed or copied
// strings. Key set and fallback behaviour mirror the CLI's
// getTranslations: the catalog is built from the union of the source,
// fallback, and target locales' active keys (a key missing from the
// target .po still ships, resolved through the fallback chain), and each
// key resolves as target translation, fallback translation, source
// translation, the message's default text, then the id itself.
const fs = require('node:fs');
const path = require('node:path');

const {getConfig} = require('@lingui/conf');
const {createCompiledCatalog} = require('@lingui/cli/api');
const {formatter} = require('@lingui/format-po');

const {poCacheKey} = require('./jestPoCacheKey.cjs');

const poFormatter = formatter();

const localeOf = sourcePath => {
  const match = /locales[/\\]([^/\\]+)[/\\]messages\.po$/.exec(sourcePath);
  if (!match) {
    throw new Error(
      `jestPoTransformer: cannot determine locale from ${sourcePath}`,
    );
  }
  return match[1];
};

// The active (non-obsolete) entries of a parsed catalog, by message id.
const activeEntries = catalog => {
  const entries = new Map();
  for (const [id, message] of Object.entries(catalog)) {
    if (!message.obsolete) {
      entries.set(id, message);
    }
  }
  return entries;
};

const compilePoFile = (sourceText, sourcePath, rootDir) => {
  const config = getConfig({cwd: rootDir});
  const locale = localeOf(sourcePath);
  const fallbackLocale =
    config.fallbackLocales?.[locale] ??
    config.fallbackLocales?.default ??
    config.sourceLocale;
  const sourceLocale = config.sourceLocale;

  // Parse the active (non-obsolete) entries of every locale in the
  // resolution chain; the target locale's content is the sourceText Jest
  // handed us, the others are read from their sibling catalog files.
  const catalogFor = otherLocale => {
    if (otherLocale === locale) {
      return poFormatter.parse(sourceText);
    }
    const catalogPath = path.join(
      path.dirname(sourcePath),
      '..',
      otherLocale,
      'messages.po',
    );
    return poFormatter.parse(fs.readFileSync(catalogPath, 'utf8'));
  };
  const targetEntries = activeEntries(catalogFor(locale));
  const fallbackEntries =
    fallbackLocale === locale
      ? targetEntries
      : activeEntries(catalogFor(fallbackLocale));
  const sourceEntries =
    sourceLocale === locale
      ? targetEntries
      : sourceLocale === fallbackLocale
        ? fallbackEntries
        : activeEntries(catalogFor(sourceLocale));

  const ids = new Set([
    ...targetEntries.keys(),
    ...fallbackEntries.keys(),
    ...sourceEntries.keys(),
  ]);
  const messages = {};
  for (const id of ids) {
    messages[id] =
      targetEntries.get(id)?.translation ||
      fallbackEntries.get(id)?.translation ||
      sourceEntries.get(id)?.translation ||
      targetEntries.get(id)?.message ||
      sourceEntries.get(id)?.message ||
      id;
  }

  const {source, errors} = createCompiledCatalog(locale, messages, {
    strict: false,
    namespace: 'cjs',
  });
  if (errors.length > 0) {
    throw new Error(
      `jestPoTransformer: failed to compile ${sourcePath}: ${errors
        .map(({id, error}) => `${id}: ${error.message}`)
        .join('; ')}`,
    );
  }
  return source;
};

module.exports = {
  process: (sourceText, sourcePath, options) => ({
    code: compilePoFile(sourceText, sourcePath, options.config.rootDir),
  }),
  getCacheKey: (sourceText, sourcePath) =>
    poCacheKey(sourceText, sourcePath, fs.readFileSync(__filename, 'utf8')),
};

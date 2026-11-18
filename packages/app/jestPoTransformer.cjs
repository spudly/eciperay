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
// strings. Fallback behaviour mirrors the CLI's getTranslations: an empty
// translation falls back to the configured fallback locale's translation,
// then to the message's default text.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const {getConfig} = require('@lingui/conf');
const {createCompiledCatalog} = require('@lingui/cli/api');
const {formatter} = require('@lingui/format-po');

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

const compilePoFile = (sourceText, sourcePath, rootDir) => {
  const config = getConfig({cwd: rootDir});
  const locale = localeOf(sourcePath);
  const fallbackLocale =
    config.fallbackLocales?.[locale] ??
    config.fallbackLocales?.default ??
    config.sourceLocale;

  const catalog = poFormatter.parse(sourceText);
  let fallbackCatalog = {};
  if (fallbackLocale !== locale) {
    const fallbackPath = path.join(
      path.dirname(sourcePath),
      '..',
      fallbackLocale,
      'messages.po',
    );
    fallbackCatalog = poFormatter.parse(fs.readFileSync(fallbackPath, 'utf8'));
  }

  const messages = {};
  for (const [id, message] of Object.entries(catalog)) {
    if (message.obsolete) {
      continue;
    }
    messages[id] =
      message.translation ||
      fallbackCatalog[id]?.translation ||
      message.message ||
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

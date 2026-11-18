'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

// Cache key for a Jest-compiled .po catalog (see jestPoTransformer.cjs).
// Fallback and source locales mean one catalog's compiled output can
// depend on the other locales' .po files, so the key covers every
// catalog in the same locales tree as the file being transformed (the
// real src/i18n/locales tree, or a fixture tree in tests) plus the
// transformer's own source. Kept free of @lingui imports so tests can
// require it directly — Jest's sandboxed require cannot load the
// transformer's ESM-only dependencies.
const poCacheKey = (sourceText, sourcePath, transformerSource) => {
  const hash = crypto.createHash('sha256');
  hash.update(sourceText);
  hash.update(transformerSource);
  const localesDir = path.dirname(path.dirname(sourcePath));
  for (const locale of fs.readdirSync(localesDir).sort()) {
    const catalogPath = path.join(localesDir, locale, 'messages.po');
    if (fs.existsSync(catalogPath)) {
      hash.update(fs.readFileSync(catalogPath, 'utf8'));
    }
  }
  return hash.digest('hex');
};

module.exports = {poCacheKey};

const fs = require('node:fs');
const path = require('node:path');

const dotenv = require('dotenv');

/** @typedef {'API_BASE_URL' | 'SUPABASE_URL' | 'SUPABASE_ANON_KEY'} AppEnvKey */

/** @type {readonly AppEnvKey[]} */
const APP_ENV_KEYS = Object.freeze([
  'API_BASE_URL',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
]);

const isProductionAppEnv = () =>
  process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production';

/**
 * @param {string} monorepoRoot
 * @returns {Record<AppEnvKey, string | undefined>}
 */
const loadAppEnvVars = monorepoRoot => {
  const base =
    dotenv.config({path: path.join(monorepoRoot, '.env'), processEnv: false})
      .parsed ?? {};

  const production = isProductionAppEnv()
    ? (dotenv.config({
        path: path.join(monorepoRoot, '.env.production'),
        processEnv: false,
      }).parsed ?? {})
    : {};

  /** @type {Record<AppEnvKey, string | undefined>} */
  const merged = {};
  for (const key of APP_ENV_KEYS) {
    merged[key] = process.env[key] ?? production[key] ?? base[key];
  }
  return merged;
};

/**
 * @param {Record<AppEnvKey, string | undefined>} vars
 * @returns {string}
 */
const buildEnvShimSource = vars => {
  const lines = APP_ENV_KEYS.map(key => {
    const value = vars[key];
    if (value === undefined) {
      return `exports.${key} = undefined;`;
    }
    return `exports.${key} = ${JSON.stringify(value)};`;
  });
  return `${lines.join('\n')}\n`;
};

/** @param {Record<AppEnvKey, string | undefined>} vars */
const assertProductionEnvVars = vars => {
  const missing = APP_ENV_KEYS.filter(key => {
    const value = vars[key];
    return typeof value !== 'string' || value.length === 0;
  });
  if (missing.length > 0) {
    throw new Error(
      `Missing production mobile env for release bundle: ${missing.join(', ')}. ` +
        'Set them in .env.production or export before building.',
    );
  }
};

/** @param {{monorepoRoot: string; outputPath: string}} options */
const writeEnvShim = ({monorepoRoot, outputPath}) => {
  const vars = loadAppEnvVars(monorepoRoot);
  if (isProductionAppEnv()) {
    assertProductionEnvVars(vars);
  }
  fs.writeFileSync(outputPath, buildEnvShimSource(vars));
};

module.exports = {
  APP_ENV_KEYS,
  assertProductionEnvVars,
  buildEnvShimSource,
  isProductionAppEnv,
  loadAppEnvVars,
  writeEnvShim,
};

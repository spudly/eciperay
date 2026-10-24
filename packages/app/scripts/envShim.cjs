const fs = require('node:fs');
const path = require('node:path');

const dotenv = require('dotenv');

/**
 * @typedef {'API_BASE_URL'
 *   | 'SUPABASE_URL'
 *   | 'SUPABASE_ANON_KEY'
 *   | 'POSTHOG_KEY'
 *   | 'POSTHOG_HOST'
 *   | 'EXP205_FIXTURES'} AppEnvKey
 */

/** @type {readonly AppEnvKey[]} */
const REQUIRED_PRODUCTION_ENV_KEYS = Object.freeze([
  'API_BASE_URL',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
]);

/** @type {readonly AppEnvKey[]} */
const APP_ENV_KEYS = Object.freeze([
  'API_BASE_URL',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'POSTHOG_KEY',
  'POSTHOG_HOST',
  'EXP205_FIXTURES',
]);

const isProductionAppEnv = () =>
  process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production';

/**
 * @param {string} monorepoRoot
 * @returns {Record<AppEnvKey, string | undefined>}
 */
const loadAppEnvVars = monorepoRoot => {
  const devVars = isProductionAppEnv()
    ? {}
    : (dotenv.config({
        path: path.join(monorepoRoot, '.env'),
        processEnv: {},
        quiet: true,
      }).parsed ?? {});

  /** @type {Record<AppEnvKey, string | undefined>} */
  const merged = {};
  for (const key of APP_ENV_KEYS) {
    merged[key] = process.env[key] ?? devVars[key];
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
  const missing = REQUIRED_PRODUCTION_ENV_KEYS.filter(key => {
    const value = vars[key];
    return typeof value !== 'string' || value.length === 0;
  });
  if (missing.length > 0) {
    throw new Error(
      `Missing production mobile env for release bundle: ${missing.join(', ')}. ` +
        'Export API_BASE_URL, SUPABASE_URL, and SUPABASE_ANON_KEY before building.',
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
  REQUIRED_PRODUCTION_ENV_KEYS,
  assertProductionEnvVars,
  buildEnvShimSource,
  isProductionAppEnv,
  loadAppEnvVars,
  writeEnvShim,
};

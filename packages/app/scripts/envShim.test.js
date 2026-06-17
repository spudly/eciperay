const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  assertProductionEnvVars,
  buildEnvShimSource,
  isProductionAppEnv,
  loadAppEnvVars,
  writeEnvShim,
} = require('./envShim');

describe('envShim', () => {
  const originalEnv = {...process.env};

  afterEach(() => {
    process.env = {...originalEnv};
  });

  test('detects production from APP_ENV or NODE_ENV', () => {
    delete process.env.APP_ENV;
    delete process.env.NODE_ENV;
    expect(isProductionAppEnv()).toBe(false);

    process.env.APP_ENV = 'production';
    expect(isProductionAppEnv()).toBe(true);

    delete process.env.APP_ENV;
    process.env.NODE_ENV = 'production';
    expect(isProductionAppEnv()).toBe(true);
  });

  test('loads development values from .env only', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'env-shim-dev-'));
    fs.writeFileSync(
      path.join(root, '.env'),
      'API_BASE_URL=http://localhost:8080/api\nSUPABASE_URL=https://dev.supabase.co\nSUPABASE_ANON_KEY=dev-key\nSECRET=leak\n',
    );
    delete process.env.APP_ENV;
    delete process.env.NODE_ENV;

    expect(loadAppEnvVars(root)).toEqual({
      API_BASE_URL: 'http://localhost:8080/api',
      SUPABASE_ANON_KEY: 'dev-key',
      SUPABASE_URL: 'https://dev.supabase.co',
    });
  });

  test('requires exported env vars for release bundles', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'env-shim-prod-'));
    fs.writeFileSync(
      path.join(root, '.env'),
      'API_BASE_URL=http://localhost:8080/api\nSUPABASE_URL=https://dev.supabase.co\nSUPABASE_ANON_KEY=dev-key\n',
    );
    process.env.NODE_ENV = 'production';
    process.env.API_BASE_URL = 'https://eciperay.com/api';
    process.env.SUPABASE_URL = 'https://prod.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'prod-key';

    expect(loadAppEnvVars(root)).toEqual({
      API_BASE_URL: 'https://eciperay.com/api',
      SUPABASE_ANON_KEY: 'prod-key',
      SUPABASE_URL: 'https://prod.supabase.co',
    });
  });

  test('prefers process.env over .env in development', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'env-shim-env-'));
    fs.writeFileSync(
      path.join(root, '.env'),
      'API_BASE_URL=http://localhost:8080/api\nSUPABASE_URL=https://dev.supabase.co\nSUPABASE_ANON_KEY=dev-key\n',
    );
    delete process.env.APP_ENV;
    delete process.env.NODE_ENV;
    process.env.API_BASE_URL = 'https://override.example/api';

    expect(loadAppEnvVars(root).API_BASE_URL).toBe(
      'https://override.example/api',
    );
  });

  test('buildEnvShimSource exports only mobile keys', () => {
    expect(
      buildEnvShimSource({
        API_BASE_URL: 'https://eciperay.com/api',
        SUPABASE_URL: 'https://prod.supabase.co',
        SUPABASE_ANON_KEY: 'anon',
      }),
    ).toBe(
      'exports.API_BASE_URL = "https://eciperay.com/api";\n' +
        'exports.SUPABASE_URL = "https://prod.supabase.co";\n' +
        'exports.SUPABASE_ANON_KEY = "anon";\n',
    );
  });

  test('assertProductionEnvVars rejects missing values', () => {
    expect(() => {
      assertProductionEnvVars({
        API_BASE_URL: 'https://eciperay.com/api',
        SUPABASE_URL: '',
        SUPABASE_ANON_KEY: 'anon',
      });
    }).toThrow(/SUPABASE_URL/);
  });

  test('writeEnvShim fails for incomplete production env', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'env-shim-write-'));
    const outputPath = path.join(root, 'env-shim.js');
    process.env.APP_ENV = 'production';
    delete process.env.API_BASE_URL;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;

    expect(() => {
      writeEnvShim({monorepoRoot: root, outputPath});
    }).toThrow(/Missing production mobile env/);
  });

  test('writeEnvShim writes production bundle env from exports', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'env-shim-write-ok-'));
    const outputPath = path.join(root, 'env-shim.js');
    process.env.APP_ENV = 'production';
    process.env.API_BASE_URL = 'https://eciperay.com/api';
    process.env.SUPABASE_URL = 'https://prod.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'prod-key';

    writeEnvShim({monorepoRoot: root, outputPath});

    expect(fs.readFileSync(outputPath, 'utf8')).toContain(
      'https://eciperay.com/api',
    );
  });
});

const ALLOWED_SCOPES = [
  'app',
  'web',
  'server',
  'client',
  'types',
  'android',
  'deps',
  'ci',
  'release',
];

/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-empty': [2, 'never'],
    'scope-enum': [0],
    'eciperay-scope': [2, 'always'],
  },
  plugins: [
    {
      rules: {
        'eciperay-scope': parsed => {
          const {scope} = parsed;
          if (!scope) {
            return [false, 'commit must include a scope'];
          }

          const scopes = scope.split(/,\s*/u);
          const invalid = scopes.filter(
            entry => !ALLOWED_SCOPES.includes(entry),
          );
          if (invalid.length > 0) {
            return [
              false,
              `scope must be one of [${ALLOWED_SCOPES.join(', ')}]; got: ${invalid.join(', ')}`,
            ];
          }

          return [true];
        },
      },
    },
  ],
};

// Integration tests: real HTTP into the Nest app, real Postgres (quacker_test).
const { jest: unit } = require('./package.json');

module.exports = {
  ...unit,
  testRegex: '\\.int-spec\\.ts$',
  moduleFileExtensions: [...unit.moduleFileExtensions, 'tsx', 'mjs'],
  // better-auth and its dependencies ship ESM only, so they get transpiled too.
  transform: {
    '^.+\\.(t|j)sx?$|^.+\\.mjs$': [
      'ts-jest',
      { isolatedModules: true, tsconfig: { allowJs: true } },
    ],
  },
  transformIgnorePatterns: [],
  globalSetup: '<rootDir>/src/test/int.global-setup.ts',
  setupFiles: ['<rootDir>/src/test/int.env.ts'],
};

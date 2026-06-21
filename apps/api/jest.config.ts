import type { Config } from 'jest';
const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: 'src/.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  moduleNameMapper: {
    '^@zanweb/shared$': '<rootDir>/../../packages/shared/src',
    '^@zanweb/prisma/client$': '<rootDir>/../../packages/prisma/src/client',
  },
  // The @zanweb/shared package is ESM ("type":"module") and uses .js extension
  // specifiers in its internal imports (e.g. `./enums.js`). Jest runs CommonJS
  // so those specifiers must resolve to the underlying .ts source. A scoped
  // custom resolver handles this only for files within the shared package,
  // avoiding collisions with node_modules (e.g. @babel) source maps.
  resolver: '<rootDir>/test/shared-js-resolver.js',
};
export default config;
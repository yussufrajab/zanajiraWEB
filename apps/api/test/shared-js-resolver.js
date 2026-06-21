'use strict';

const { existsSync } = require('fs');
const { resolve } = require('path');

/**
 * Custom Jest resolver for the @zanweb/shared package.
 *
 * `@zanweb/shared` is ESM ("type":"module") and imports its own modules with
 * `.js` extension specifiers (e.g. `export * from './enums.js'`). Jest runs
 * CommonJS and cannot resolve those to the `.ts` source files on its own.
 *
 * This resolver rewrites a relative `.js` specifier to the corresponding `.ts`
 * file, but ONLY when the importing module lives inside `packages/shared/src`.
 * Everything else (including node_modules source maps such as @babel, which
 * also use relative `.js` specifiers) is delegated to Node's default resolver.
 *
 * `sharedRoot` is derived from this file's own location
 * (apps/api/test -> packages/shared/src) so the resolver is independent of the
 * directory jest is invoked from.
 */
const sharedRoot = resolve(__dirname, '../../../packages/shared/src');

module.exports = function resolveModule(modulePath, options) {
  const basedir = options && options.basedir;
  const insideShared = basedir && basedir.startsWith(sharedRoot);
  if (insideShared && (modulePath.startsWith('./') || modulePath.startsWith('../'))) {
    const candidate = resolve(basedir, modulePath.replace(/\.js$/, '.ts'));
    if (existsSync(candidate)) return candidate;
  }
  return require.resolve(modulePath, { paths: [basedir] });
};
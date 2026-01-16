import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outDir: 'dist',
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  clean: true,
  skipNodeModulesBundle: true,
  treeshake: true,
  // Bundle workspace packages since they export .ts files
  noExternal: [/^@pathfinding\//],
  // Use .js extension since package.json has "type": "module"
  outExtensions: () => ({ js: '.js' }),
});

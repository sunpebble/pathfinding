import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/index.ts'],
  format: 'esm',
  outDir: 'dist',
  platform: 'node',
  target: 'node22',
  clean: true,
  sourcemap: true,
});

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // d1-integration.test.ts runs under @cloudflare/vitest-pool-workers via
    // vitest.d1.config.ts — exclude it from the default node suite.
    include: ['src/**/*.test.ts'],
    exclude: ['src/test/d1-integration.test.ts', 'node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});

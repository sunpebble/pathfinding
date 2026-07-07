import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Separate vitest config that runs ONLY the D1 integration test inside the
 * Cloudflare Workers runtime via @cloudflare/vitest-pool-workers. This gives
 * us a real workerd-backed D1 instance so we can lock down SQLite semantics
 * (updated_at triggers, RETURNING, json columns) that node mocks cannot
 * reproduce.
 *
 * The default `vitest.config.ts` excludes this file so the regular node
 * suite is unaffected.
 */
export default defineConfig(async () => {
  const migrationsPath = path.join(__dirname, '..', 'database', 'drizzle');
  const migrations = await readD1Migrations(migrationsPath);

  return {
    plugins: [
      cloudflareTest({
        miniflare: {
          d1Databases: ['TEST_DB'],
          bindings: { TEST_MIGRATIONS: migrations },
        },
      }),
    ],
    test: {
      include: ['src/test/d1-integration.test.ts'],
      setupFiles: ['./src/test/d1-apply-migrations.ts'],
    },
  };
});

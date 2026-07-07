import { applyD1Migrations } from 'cloudflare:test';
import { env } from 'cloudflare:workers';

// Setup files run outside the per-test-file storage isolation, and may be
// re-run. `applyD1Migrations()` only applies un-applied migrations, so calling
// it here is safe.
// Top-level await is required by @cloudflare/vitest-pool-workers setup files.
// eslint-disable-next-line antfu/no-top-level-await
await applyD1Migrations(env.TEST_DB, env.TEST_MIGRATIONS);

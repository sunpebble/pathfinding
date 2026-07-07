// Test-only Cloudflare.Env augmentation for the D1 integration test.
// Read by @cloudflare/vitest-pool-workers when resolving `env` from
// `cloudflare:workers`.
declare namespace Cloudflare {
  interface Env {
    TEST_DB: D1Database;
    TEST_MIGRATIONS: { name: string; queries: string[] }[];
  }
}

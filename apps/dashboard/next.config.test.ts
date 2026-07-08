import { describe, expect, it } from 'vitest';
import nextConfig from './next.config';

describe('dashboard next.config rewrites', () => {
  it('rewrites all /api/* requests to the backend', async () => {
    const rules = await nextConfig.rewrites!();
    const flat = Array.isArray(rules)
      ? rules
      : (rules as { afterFiles: Array<{ source: string; destination: string }> }).afterFiles;

    expect(flat).toContainEqual({
      source: '/api/:path*',
      destination: 'http://localhost:3000/api/:path*',
    });
  });
});

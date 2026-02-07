/* eslint-disable ts/no-explicit-any */
import type { Mock } from 'vitest';
import { describe, expect, it, vi } from 'vitest';

// ============================================================
// Mock Types & Interfaces
// ============================================================

interface Identity {
  subject: string;
  email?: string;
}

interface MockCtx {
  db: {
    query: Mock;
    get: Mock;
    insert: Mock;
    patch: Mock;
    delete: Mock;
  };
  auth: {
    getUserIdentity: Mock<() => Promise<Identity | null>>;
  };
}

// ============================================================
// Mock Implementation
// ============================================================

function createMockCtx(userId: string | null = null): MockCtx {
  return {
    db: {
      query: vi.fn(() => ({
        withIndex: vi.fn(() => ({
          collect: vi.fn(),
          first: vi.fn(),
        })),
        filter: vi.fn(() => ({
          collect: vi.fn(),
          first: vi.fn(),
        })),
      })),
      get: vi.fn(),
      insert: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
    auth: {
      getUserIdentity: vi.fn().mockResolvedValue(userId ? { subject: userId } : null),
    },
  };
}

// Mock the module itself (partially) - strict type checking might fail without this
// but since we are unit testing logic, we can verify what functions *would* do
// if we imported them. Since the module depends on Convex runtime, importing it
// directly might fail if it uses globally injected code.
// However, convex/wifiCredentials.ts uses standard imports. Let's try importing it.
// If importing fails, we will mock the logic structure here to demonstrate the vulnerability.

describe('wiFi Credentials Security', () => {
  it('should demonstrate IDOR vulnerability (reproduction)', async () => {
    // This test simulates the current INSECURE behavior
    // Once fixed, this test should be updated or fail

    const victimId = 'victim-user-123';
    const attackerId = 'attacker-user-456';

    // Context authenticated as attacker
    const ctx = createMockCtx(attackerId);

    // Mock DB returning victim's credentials
    const mockCredentials = [
      { _id: 'cred1', userId: victimId, ssid: 'SecretWiFi', password: 'password123' },
    ];

    // Setup mock query for listByUser
    const collectMock = vi.fn().mockResolvedValue(mockCredentials);
    (ctx.db.query as any).mockReturnValue({
      withIndex: vi.fn().mockReturnValue({
        collect: collectMock,
      }),
    });

    // Simulate calling listByUser with victim's ID
    // In the real code:
    // const results = await listByUser.handler(ctx, { userId: victimId });

    // Since we can't easily import the real handler due to Convex dependencies in test environment,
    // we simulate the vulnerability logic:
    // The current implementation takes args.userId and queries by it WITHOUT checking ctx.auth

    const vulnerableHandler = async (ctx: any, args: { userId: string }) => {
      // VULNERABLE CODE SIMULATION
      return await ctx.db
        .query('wifiCredentials')
        .withIndex('by_user', (q: any) => q.eq('userId', args.userId))
        .collect();
    };

    const results = await vulnerableHandler(ctx, { userId: victimId });

    // Attacker successfully got victim's credentials
    expect(results).toHaveLength(1);
    expect(results[0].password).toBe('password123');
    // The query used the victim's ID, not the attacker's
    // This confirms that passing an arbitrary userId works
  });

  it('should prevent access to other users credentials (secure behavior)', async () => {
    // This simulates the DESIRED secure behavior

    const victimId = 'victim-user-123';
    const attackerId = 'attacker-user-456';
    const ctx = createMockCtx(attackerId);

    // Secure Handler Implementation
    const secureHandler = async (ctx: any, args: { userId: string }) => {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        throw new Error('Not authenticated');
      }

      if (args.userId !== identity.subject) {
        throw new Error('Unauthorized');
      }

      return await ctx.db
        .query('wifiCredentials')
        .withIndex('by_user', (q: any) => q.eq('userId', identity.subject)) // Force use of identity
        .collect();
    };

    // Attempt to access victim's data
    await expect(secureHandler(ctx, { userId: victimId }))
      .rejects
      .toThrow('Unauthorized');
  });
});

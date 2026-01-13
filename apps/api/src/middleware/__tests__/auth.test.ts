import type { Context } from 'hono';
import { ConvexHttpClient } from 'convex/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authMiddleware, optionalAuthMiddleware } from '../auth';

// Mock ConvexHttpClient
vi.mock('convex/browser', () => ({
  ConvexHttpClient: vi.fn(),
}));

// Mock the convex api
vi.mock('../../lib/convex', () => ({
  api: {
    users: {
      getCurrentUser: 'users.getCurrentUser',
    },
  },
}));

describe('authMiddleware', () => {
  let mockContext: Partial<Context>;
  let mockNext: ReturnType<typeof vi.fn>;
  let mockConvexClient: {
    setAuth: ReturnType<typeof vi.fn>;
    query: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup mock context
    mockContext = {
      req: {
        header: vi.fn(),
      } as any,
      json: vi.fn((body, status) => ({ body, status })) as any,
      set: vi.fn() as any,
    };

    // Setup mock next function
    mockNext = vi.fn();

    // Setup mock Convex client
    mockConvexClient = {
      setAuth: vi.fn(),
      query: vi.fn(),
    };

    // Mock ConvexHttpClient constructor
    (ConvexHttpClient as any).mockImplementation(() => mockConvexClient);

    // Set default environment variable
    process.env.CONVEX_URL = 'https://test.convex.cloud';
  });

  it('should return 401 when Authorization header is missing', async () => {
    (mockContext.req!.header as any).mockReturnValue(undefined);

    const result = await authMiddleware(mockContext as Context, mockNext);

    expect(result).toEqual({
      body: { error: 'Missing or invalid authorization header' },
      status: 401,
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 when Authorization header does not start with "Bearer "', async () => {
    (mockContext.req!.header as any).mockReturnValue('InvalidToken');

    const result = await authMiddleware(mockContext as Context, mockNext);

    expect(result).toEqual({
      body: { error: 'Missing or invalid authorization header' },
      status: 401,
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 when CONVEX_URL is not set', async () => {
    (mockContext.req!.header as any).mockReturnValue('Bearer valid-token');
    delete process.env.CONVEX_URL;

    const result = await authMiddleware(mockContext as Context, mockNext);

    expect(result).toEqual({
      body: { error: 'Authentication failed' },
      status: 401,
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 when token validation returns null user', async () => {
    (mockContext.req!.header as any).mockReturnValue('Bearer valid-token');
    mockConvexClient.query.mockResolvedValue(null);

    const result = await authMiddleware(mockContext as Context, mockNext);

    expect(mockConvexClient.setAuth).toHaveBeenCalledWith('valid-token');
    expect(mockConvexClient.query).toHaveBeenCalled();
    expect(result).toEqual({
      body: { error: 'Invalid or expired token' },
      status: 401,
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 when user has no ID', async () => {
    (mockContext.req!.header as any).mockReturnValue('Bearer valid-token');
    mockConvexClient.query.mockResolvedValue({
      email: 'test@example.com',
      // id is missing
    });

    const result = await authMiddleware(mockContext as Context, mockNext);

    expect(result).toEqual({
      body: { error: 'Invalid token: no user ID found' },
      status: 401,
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 when ConvexHttpClient query throws an error', async () => {
    (mockContext.req!.header as any).mockReturnValue('Bearer invalid-token');
    mockConvexClient.query.mockRejectedValue(new Error('Invalid token'));

    const result = await authMiddleware(mockContext as Context, mockNext);

    expect(result).toEqual({
      body: { error: 'Authentication failed' },
      status: 401,
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should set user context and call next() with valid token', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    };

    (mockContext.req!.header as any).mockReturnValue('Bearer valid-token');
    mockConvexClient.query.mockResolvedValue(mockUser);

    await authMiddleware(mockContext as Context, mockNext);

    expect(mockConvexClient.setAuth).toHaveBeenCalledWith('valid-token');
    expect(mockConvexClient.query).toHaveBeenCalled();
    expect(mockContext.set).toHaveBeenCalledWith('userId', 'user-123');
    expect(mockContext.set).toHaveBeenCalledWith(
      'userEmail',
      'test@example.com'
    );
    expect(mockContext.set).toHaveBeenCalledWith('accessToken', 'valid-token');
    expect(mockNext).toHaveBeenCalled();
  });

  it('should use empty string for email when user email is undefined', async () => {
    const mockUser = {
      id: 'user-123',
      // email is undefined
    };

    (mockContext.req!.header as any).mockReturnValue('Bearer valid-token');
    mockConvexClient.query.mockResolvedValue(mockUser);

    await authMiddleware(mockContext as Context, mockNext);

    expect(mockContext.set).toHaveBeenCalledWith('userId', 'user-123');
    expect(mockContext.set).toHaveBeenCalledWith('userEmail', '');
    expect(mockContext.set).toHaveBeenCalledWith('accessToken', 'valid-token');
    expect(mockNext).toHaveBeenCalled();
  });
});

describe('optionalAuthMiddleware', () => {
  let mockContext: Partial<Context>;
  let mockNext: ReturnType<typeof vi.fn>;
  let mockConvexClient: {
    setAuth: ReturnType<typeof vi.fn>;
    query: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup mock context
    mockContext = {
      req: {
        header: vi.fn(),
      } as any,
      json: vi.fn((body, status) => ({ body, status })) as any,
      set: vi.fn() as any,
    };

    // Setup mock next function
    mockNext = vi.fn();

    // Setup mock Convex client
    mockConvexClient = {
      setAuth: vi.fn(),
      query: vi.fn(),
    };

    // Mock ConvexHttpClient constructor
    (ConvexHttpClient as any).mockImplementation(() => mockConvexClient);

    // Set default environment variable
    process.env.CONVEX_URL = 'https://test.convex.cloud';
  });

  it('should call next() without setting context when no Authorization header', async () => {
    (mockContext.req!.header as any).mockReturnValue(undefined);

    await optionalAuthMiddleware(mockContext as Context, mockNext);

    expect(mockContext.set).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
  });

  it('should call next() without setting context when Authorization header does not start with "Bearer "', async () => {
    (mockContext.req!.header as any).mockReturnValue('InvalidToken');

    await optionalAuthMiddleware(mockContext as Context, mockNext);

    expect(mockContext.set).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
  });

  it('should call next() without setting context when CONVEX_URL is not set', async () => {
    (mockContext.req!.header as any).mockReturnValue('Bearer valid-token');
    delete process.env.CONVEX_URL;

    await optionalAuthMiddleware(mockContext as Context, mockNext);

    expect(mockContext.set).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
  });

  it('should call next() without setting context when token validation fails', async () => {
    (mockContext.req!.header as any).mockReturnValue('Bearer invalid-token');
    mockConvexClient.query.mockRejectedValue(new Error('Invalid token'));

    await optionalAuthMiddleware(mockContext as Context, mockNext);

    expect(mockContext.set).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
  });

  it('should call next() without setting context when user is null', async () => {
    (mockContext.req!.header as any).mockReturnValue('Bearer valid-token');
    mockConvexClient.query.mockResolvedValue(null);

    await optionalAuthMiddleware(mockContext as Context, mockNext);

    expect(mockContext.set).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
  });

  it('should call next() without setting context when user has no ID', async () => {
    (mockContext.req!.header as any).mockReturnValue('Bearer valid-token');
    mockConvexClient.query.mockResolvedValue({
      email: 'test@example.com',
      // id is missing
    });

    await optionalAuthMiddleware(mockContext as Context, mockNext);

    expect(mockContext.set).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
  });

  it('should set user context and call next() with valid token', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    };

    (mockContext.req!.header as any).mockReturnValue('Bearer valid-token');
    mockConvexClient.query.mockResolvedValue(mockUser);

    await optionalAuthMiddleware(mockContext as Context, mockNext);

    expect(mockConvexClient.setAuth).toHaveBeenCalledWith('valid-token');
    expect(mockConvexClient.query).toHaveBeenCalled();
    expect(mockContext.set).toHaveBeenCalledWith('userId', 'user-123');
    expect(mockContext.set).toHaveBeenCalledWith(
      'userEmail',
      'test@example.com'
    );
    expect(mockContext.set).toHaveBeenCalledWith('accessToken', 'valid-token');
    expect(mockNext).toHaveBeenCalled();
  });

  it('should use empty string for email when user email is undefined', async () => {
    const mockUser = {
      id: 'user-123',
      // email is undefined
    };

    (mockContext.req!.header as any).mockReturnValue('Bearer valid-token');
    mockConvexClient.query.mockResolvedValue(mockUser);

    await optionalAuthMiddleware(mockContext as Context, mockNext);

    expect(mockContext.set).toHaveBeenCalledWith('userId', 'user-123');
    expect(mockContext.set).toHaveBeenCalledWith('userEmail', '');
    expect(mockContext.set).toHaveBeenCalledWith('accessToken', 'valid-token');
    expect(mockNext).toHaveBeenCalled();
  });
});

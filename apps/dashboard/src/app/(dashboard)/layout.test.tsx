import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockAuthContext, mockRouter } from '@/test/setup';

import DashboardLayout from './layout';

const mockUseAuth = vi.fn();

vi.mock('@/providers/auth-provider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/providers/auth-provider')>();
  return { ...actual, useAuthContext: () => mockUseAuth() };
});

// Sidebar/Header pull in health-check polling and other providers that are
// out of scope for a guard test — stub them so this test only exercises the
// auth gate.
vi.mock('@/components/sidebar', () => ({ Sidebar: () => null }));
vi.mock('@/components/header', () => ({ Header: () => null }));

describe('dashboardLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRouter.push.mockReset();
    mockRouter.replace.mockReset();
    mockRouter.prefetch.mockReset();
  });

  it('redirects unauthenticated users to / and renders nothing', async () => {
    mockUseAuth.mockReturnValue(
      createMockAuthContext({ isAuthenticated: false, isLoading: false }),
    );

    render(<DashboardLayout><div>secret content</div></DashboardLayout>);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/');
    });
    expect(screen.queryByText('secret content')).not.toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    mockUseAuth.mockReturnValue(
      createMockAuthContext({ isAuthenticated: true, isLoading: false }),
    );

    render(<DashboardLayout><div>secret content</div></DashboardLayout>);

    expect(screen.getByText('secret content')).toBeInTheDocument();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('does not redirect or render children while auth state is loading', () => {
    mockUseAuth.mockReturnValue(
      createMockAuthContext({ isAuthenticated: false, isLoading: true }),
    );

    render(<DashboardLayout><div>secret content</div></DashboardLayout>);

    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(screen.queryByText('secret content')).not.toBeInTheDocument();
  });
});

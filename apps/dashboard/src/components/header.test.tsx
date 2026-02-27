import type { UseQueryResult } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useHealthStatus } from '@/hooks/use-health-status';

import { Header } from './header';

const mockRefetch = vi.fn();

vi.mock('@/hooks/use-health-status', () => ({
  useHealthStatus: vi.fn(() => ({
    data: null,
    isLoading: false,
    refetch: mockRefetch,
  })),
}));

vi.mock('./auth-button', () => ({
  AuthButton: () => <div data-testid="auth-button">Auth Button</div>,
}));

describe('header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the dashboard title', () => {
    render(<Header />);
    expect(screen.getByText('Pathfinding Crawler Dashboard')).toBeDefined();
  });

  it('renders auth button', () => {
    render(<Header />);
    expect(screen.getByTestId('auth-button')).toBeDefined();
  });

  it('shows loading spinner when health status is loading', () => {
    vi.mocked(useHealthStatus).mockReturnValue({
      data: null,
      isLoading: true,
      refetch: mockRefetch,
    } as unknown as UseQueryResult<any, Error>);

    render(<Header />);
    const spinningIcon = document.querySelector('.animate-spin');
    expect(spinningIcon).not.toBeNull();
  });

  it('shows connected status when health is ok', () => {
    vi.mocked(useHealthStatus).mockReturnValue({
      data: { status: 'ok' },
      isLoading: false,
      refetch: mockRefetch,
    } as unknown as UseQueryResult<any, Error>);

    render(<Header />);
    expect(screen.getByText('Connected')).toBeDefined();
  });

  it('shows connected status when health is healthy', () => {
    vi.mocked(useHealthStatus).mockReturnValue({
      data: { status: 'healthy' },
      isLoading: false,
      refetch: mockRefetch,
    } as unknown as UseQueryResult<any, Error>);

    render(<Header />);
    expect(screen.getByText('Connected')).toBeDefined();
  });

  it('shows disconnected status when health check fails', () => {
    vi.mocked(useHealthStatus).mockReturnValue({
      data: { status: 'error' },
      isLoading: false,
      refetch: mockRefetch,
    } as unknown as UseQueryResult<any, Error>);

    render(<Header />);
    expect(screen.getByText('Disconnected')).toBeDefined();
  });

  it('shows disconnected status when no health data', () => {
    vi.mocked(useHealthStatus).mockReturnValue({
      data: null,
      isLoading: false,
      refetch: mockRefetch,
    } as unknown as UseQueryResult<any, Error>);

    render(<Header />);
    expect(screen.getByText('Disconnected')).toBeDefined();
  });

  it('calls refetch when refresh button is clicked', () => {
    vi.mocked(useHealthStatus).mockReturnValue({
      data: { status: 'ok' },
      isLoading: false,
      refetch: mockRefetch,
    } as unknown as UseQueryResult<any, Error>);

    render(<Header />);
    const refreshButton = screen.getByTitle('Refresh status');
    fireEvent.click(refreshButton);
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});

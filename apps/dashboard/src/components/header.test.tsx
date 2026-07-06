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
    expect(screen.getByText('Sunpebble Trips 控制台')).toBeDefined();
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
    } as unknown as ReturnType<typeof useHealthStatus>);

    render(<Header />);
    const spinningIcon = document.querySelector('.animate-spin');
    expect(spinningIcon).not.toBeNull();
  });

  it('shows connected status when health is ok', () => {
    vi.mocked(useHealthStatus).mockReturnValue({
      data: { status: 'ok' },
      isLoading: false,
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useHealthStatus>);

    render(<Header />);
    const status = screen.getByText('已连接');
    expect(status).toBeDefined();
    expect(status.closest('[data-testid="service-status"]')?.className).toContain('bg-emerald-50');
  });

  it('shows connected status when health is healthy', () => {
    vi.mocked(useHealthStatus).mockReturnValue({
      data: { status: 'healthy' },
      isLoading: false,
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useHealthStatus>);

    render(<Header />);
    expect(screen.getByText('已连接')).toBeDefined();
  });

  it('shows disconnected status when health check fails', () => {
    vi.mocked(useHealthStatus).mockReturnValue({
      data: { status: 'error' },
      isLoading: false,
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useHealthStatus>);

    render(<Header />);
    const status = screen.getByText('已断开');
    expect(status).toBeDefined();
    expect(status.closest('[data-testid="service-status"]')?.className).toContain('bg-red-50');
  });

  it('shows disconnected status when no health data', () => {
    vi.mocked(useHealthStatus).mockReturnValue({
      data: null,
      isLoading: false,
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useHealthStatus>);

    render(<Header />);
    expect(screen.getByText('已断开')).toBeDefined();
  });

  it('calls refetch when refresh button is clicked', () => {
    vi.mocked(useHealthStatus).mockReturnValue({
      data: { status: 'ok' },
      isLoading: false,
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useHealthStatus>);

    render(<Header />);
    const refreshButton = screen.getByTitle('刷新状态');
    fireEvent.click(refreshButton);
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('disables refresh button and adds aria-label when loading', () => {
    vi.mocked(useHealthStatus).mockReturnValue({
      data: null,
      isLoading: true,
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useHealthStatus>);

    render(<Header />);
    const refreshButton = screen.getByLabelText('刷新状态中...') as HTMLButtonElement;
    expect(refreshButton).toBeDefined();
    expect(refreshButton.disabled).toBe(true);
    expect(refreshButton.className).toContain('opacity-50');
    expect(refreshButton.className).toContain('cursor-not-allowed');
  });
});

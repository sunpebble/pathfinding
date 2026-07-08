import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OverviewPage from './page';

vi.mock('@/hooks/use-health-status', () => ({
  useHealthStatus: vi.fn(() => ({
    data: { status: 'healthy' },
    isLoading: false,
  })),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(({ queryKey }) => {
    if (queryKey[0] === 'itineraries-overview') {
      return {
        data: {
          data: [],
          pagination: { total: 2 },
        },
      };
    }
    if (queryKey[0] === 'pois-overview') {
      return {
        data: { pagination: { total: 150 } },
      };
    }
    return { data: null };
  }),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe('overviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the page title', () => {
    render(<OverviewPage />);
    expect(screen.getByText('Sunpebble Trips 概览')).toBeDefined();
  });

  it('renders the page description', () => {
    render(<OverviewPage />);
    expect(
      screen.getByText('查看行程、地点和服务状态'),
    ).toBeDefined();
  });

  it('renders stats cards', () => {
    render(<OverviewPage />);
    expect(screen.getByText('行程计划')).toBeDefined();
    expect(screen.getByText('兴趣点')).toBeDefined();
    expect(screen.getByText('服务状态')).toBeDefined();
  });

  it('displays itinerary count', () => {
    render(<OverviewPage />);
    expect(screen.getByText('2')).toBeDefined();
  });

  it('displays POI count', () => {
    render(<OverviewPage />);
    expect(screen.getByText('150')).toBeDefined();
  });

  it('shows online status when healthy', () => {
    render(<OverviewPage />);
    expect(screen.getByText('在线')).toBeDefined();
  });

  it('renders planning actions', () => {
    render(<OverviewPage />);
    expect(screen.getByText('继续规划')).toBeDefined();
  });

  it('renders view all links', () => {
    render(<OverviewPage />);
    const links = screen.getAllByText(/打开.*→|查看.*→/);
    expect(links.length).toBeGreaterThan(0);
  });
});

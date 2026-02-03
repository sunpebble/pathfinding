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
    if (queryKey[0] === 'crawl-jobs-overview') {
      return {
        data: {
          data: [
            {
              id: '1',
              name: 'Test Job',
              platform: 'xiaohongshu',
              status: 'completed',
              statistics: { records_extracted: 100 },
            },
            {
              id: '2',
              name: 'Running Job',
              platform: 'ctrip',
              status: 'running',
              statistics: { records_extracted: 50 },
            },
          ],
          pagination: { total: 2 },
        },
      };
    }
    if (queryKey[0] === 'pois-overview') {
      return {
        data: { pagination: { total: 150 } },
      };
    }
    if (queryKey[0] === 'datasets-overview') {
      return {
        data: { pagination: { total: 5 } },
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
    expect(screen.getByText('Dashboard Overview')).toBeDefined();
  });

  it('renders the page description', () => {
    render(<OverviewPage />);
    expect(
      screen.getByText('Monitor your crawler service and data pipeline'),
    ).toBeDefined();
  });

  it('renders stats cards', () => {
    render(<OverviewPage />);
    expect(screen.getByText('Total Jobs')).toBeDefined();
    expect(screen.getByText('Normalized POIs')).toBeDefined();
    expect(screen.getByText('Datasets')).toBeDefined();
    expect(screen.getByText('Service Status')).toBeDefined();
  });

  it('displays job statistics', () => {
    render(<OverviewPage />);
    expect(screen.getByText('2')).toBeDefined();
    expect(screen.getByText('1 completed')).toBeDefined();
    expect(screen.getByText('1 running')).toBeDefined();
  });

  it('displays POI count', () => {
    render(<OverviewPage />);
    expect(screen.getByText('150')).toBeDefined();
  });

  it('displays dataset count', () => {
    render(<OverviewPage />);
    expect(screen.getByText('5')).toBeDefined();
  });

  it('shows online status when healthy', () => {
    render(<OverviewPage />);
    expect(screen.getByText('Online')).toBeDefined();
  });

  it('renders recent jobs section', () => {
    render(<OverviewPage />);
    expect(screen.getByText('Recent Jobs')).toBeDefined();
    expect(screen.getByText('Test Job')).toBeDefined();
    expect(screen.getByText('Running Job')).toBeDefined();
  });

  it('renders view all links', () => {
    render(<OverviewPage />);
    const viewAllLinks = screen.getAllByText(/View.*→/);
    expect(viewAllLinks.length).toBeGreaterThan(0);
  });

  it('renders job status badges', () => {
    render(<OverviewPage />);
    expect(screen.getByText('completed')).toBeDefined();
    expect(screen.getByText('running')).toBeDefined();
  });
});

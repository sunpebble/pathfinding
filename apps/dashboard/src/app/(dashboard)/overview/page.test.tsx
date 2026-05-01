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
    expect(screen.getByText('仪表盘概览')).toBeDefined();
  });

  it('renders the page description', () => {
    render(<OverviewPage />);
    expect(
      screen.getByText('监控抓取服务和数据管道'),
    ).toBeDefined();
  });

  it('renders stats cards', () => {
    render(<OverviewPage />);
    expect(screen.getByText('总任务数')).toBeDefined();
    expect(screen.getByText('标准化兴趣点')).toBeDefined();
    expect(screen.getByText('数据集')).toBeDefined();
    expect(screen.getByText('服务状态')).toBeDefined();
  });

  it('displays job statistics', () => {
    render(<OverviewPage />);
    expect(screen.getByText('2')).toBeDefined();
    expect(screen.getByText(/已完成/)).toBeDefined();
    expect(screen.getByText(/运行中/)).toBeDefined();
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
    expect(screen.getByText('在线')).toBeDefined();
  });

  it('renders recent jobs section', () => {
    render(<OverviewPage />);
    expect(screen.getByText('最近任务')).toBeDefined();
    expect(screen.getByText('Test Job')).toBeDefined();
    expect(screen.getByText('Running Job')).toBeDefined();
  });

  it('renders view all links', () => {
    render(<OverviewPage />);
    const viewAllLinks = screen.getAllByText(/查看.*→/);
    expect(viewAllLinks.length).toBeGreaterThan(0);
  });

  it('renders job status badges', () => {
    render(<OverviewPage />);
    expect(screen.getByText('completed')).toBeDefined();
    expect(screen.getByText('running')).toBeDefined();
  });
});

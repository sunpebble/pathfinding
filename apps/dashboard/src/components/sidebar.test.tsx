import { cleanup, render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Sidebar } from './sidebar';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
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

describe('sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePathname).mockReturnValue('/');
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the logo and brand name', () => {
    render(<Sidebar />);
    expect(screen.getByText('Crawler')).toBeDefined();
  });

  it('renders all main navigation items', () => {
    render(<Sidebar />);
    expect(screen.getByText('Overview')).toBeDefined();
    expect(screen.getByText('AI 助手')).toBeDefined();
    expect(screen.getByText('Crawl Jobs')).toBeDefined();
    expect(screen.getByText('POIs')).toBeDefined();
    expect(screen.getByText('Travel Guides')).toBeDefined();
    expect(screen.getByText('Itineraries')).toBeDefined();
    expect(screen.getByText('Training Datasets')).toBeDefined();
    expect(screen.getByText('Create Job')).toBeDefined();
  });

  it('renders secondary navigation items', () => {
    render(<Sidebar />);
    expect(screen.getByText('Settings')).toBeDefined();
  });

  it('highlights active navigation item for root path', () => {
    vi.mocked(usePathname).mockReturnValue('/');
    render(<Sidebar />);
    const overviewLink = screen.getByText('Overview').closest('a');
    expect(overviewLink?.className).toContain('bg-gray-800');
  });

  it('highlights active navigation item for jobs path', () => {
    vi.mocked(usePathname).mockReturnValue('/jobs');
    render(<Sidebar />);
    const jobsLink = screen.getByText('Crawl Jobs').closest('a');
    expect(jobsLink?.className).toContain('bg-gray-800');
  });

  it('highlights active navigation item for nested jobs path', () => {
    vi.mocked(usePathname).mockReturnValue('/jobs/123');
    render(<Sidebar />);
    const jobsLink = screen.getByText('Crawl Jobs').closest('a');
    expect(jobsLink?.className).toContain('bg-gray-800');
  });

  it('renders correct hrefs for navigation links', () => {
    render(<Sidebar />);
    expect(
      screen.getByText('Overview').closest('a')?.getAttribute('href'),
    ).toBe('/');
    expect(
      screen.getByText('Crawl Jobs').closest('a')?.getAttribute('href'),
    ).toBe('/jobs');
    expect(screen.getByText('POIs').closest('a')?.getAttribute('href')).toBe(
      '/pois',
    );
    expect(
      screen.getByText('Settings').closest('a')?.getAttribute('href'),
    ).toBe('/settings');
  });
});

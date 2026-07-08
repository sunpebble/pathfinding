import { cleanup, render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Sidebar } from './sidebar';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/overview'),
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
    vi.mocked(usePathname).mockReturnValue('/overview');
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the logo and brand name', () => {
    render(<Sidebar />);
    expect(screen.getByText('Sunpebble Trips')).toBeDefined();
  });

  it('renders all main navigation items', () => {
    render(<Sidebar />);
    expect(screen.getByText('总览')).toBeDefined();
    expect(screen.getByText('AI 助手')).toBeDefined();
    expect(screen.getByText('行程计划')).toBeDefined();
    expect(screen.getByText('费用分摊')).toBeDefined();
  });

  it('renders secondary navigation items', () => {
    render(<Sidebar />);
    expect(screen.getByText('设置')).toBeDefined();
  });

  it('highlights active navigation item for overview path', () => {
    vi.mocked(usePathname).mockReturnValue('/overview');
    render(<Sidebar />);
    const overviewLink = screen.getByText('总览').closest('a');
    expect(overviewLink?.className).toContain('bg-amber-400');
  });

  it('highlights active navigation item for itineraries path', () => {
    vi.mocked(usePathname).mockReturnValue('/itineraries');
    render(<Sidebar />);
    const itinerariesLink = screen.getByText('行程计划').closest('a');
    expect(itinerariesLink?.className).toContain('bg-amber-400');
  });

  it('highlights active navigation item for nested itineraries path', () => {
    vi.mocked(usePathname).mockReturnValue('/itineraries/123');
    render(<Sidebar />);
    const itinerariesLink = screen.getByText('行程计划').closest('a');
    expect(itinerariesLink?.className).toContain('bg-amber-400');
  });

  it('renders correct hrefs for navigation links', () => {
    render(<Sidebar />);
    expect(
      screen.getByText('总览').closest('a')?.getAttribute('href'),
    ).toBe('/overview');
    expect(screen.getByText('行程计划').closest('a')?.getAttribute('href')).toBe(
      '/itineraries',
    );
    expect(
      screen.getByText('设置').closest('a')?.getAttribute('href'),
    ).toBe('/settings');
  });
});

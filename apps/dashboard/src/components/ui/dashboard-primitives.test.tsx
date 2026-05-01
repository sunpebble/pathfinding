import { render, screen } from '@testing-library/react';
import { Database } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import {
  DashboardCard,
  DashboardEmptyState,
  DashboardLoadingState,
  DashboardPageHeader,
  DashboardTableShell,
  DashboardToolbar,
  MetricCard,
} from './dashboard-primitives';

describe('dashboard primitives', () => {
  it('renders page header with icon, description, and actions', () => {
    render(
      <DashboardPageHeader
        title="Crawler Jobs"
        description="Manage crawler runs"
        icon={Database}
        actions={<button type="button">Refresh</button>}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Crawler Jobs' })).toBeDefined();
    expect(screen.getByText('Manage crawler runs')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeDefined();
  });

  it('merges shared surface classes with custom card classes', () => {
    render(<DashboardCard className="extra-card">Content</DashboardCard>);

    const card = screen.getByText('Content');
    expect(card.className).toContain('dashboard-surface');
    expect(card.className).toContain('extra-card');
  });

  it('renders toolbar and table shell wrappers', () => {
    render(
      <>
        <DashboardToolbar>Filters</DashboardToolbar>
        <DashboardTableShell>Table</DashboardTableShell>
      </>,
    );

    expect(screen.getByText('Filters').className).toContain('dashboard-surface');
    expect(screen.getByText('Table').className).toContain('overflow-hidden');
  });

  it('renders empty and loading states', () => {
    render(
      <>
        <DashboardEmptyState
          icon={Database}
          title="No data"
          description="Create a dataset first"
        />
        <DashboardLoadingState label="Loading datasets" />
      </>,
    );

    expect(screen.getByRole('heading', { name: 'No data' })).toBeDefined();
    expect(screen.getByText('Create a dataset first')).toBeDefined();
    expect(screen.getByText('Loading datasets')).toBeDefined();
  });

  it('renders metric card value and tone classes', () => {
    render(
      <MetricCard
        label="Datasets"
        value="128"
        icon={Database}
        tone="purple"
        footer={<span>Ready</span>}
      />,
    );

    expect(screen.getByText('Datasets')).toBeDefined();
    expect(screen.getByText('128')).toBeDefined();
    expect(screen.getByText('Ready')).toBeDefined();
  });
});

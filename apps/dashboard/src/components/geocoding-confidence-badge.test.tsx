import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi, beforeAll } from 'vitest';

import { GeocodingConfidenceBadge } from './geocoding-confidence-badge';

// Polyfill ResizeObserver for Radix UI
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('GeocodingConfidenceBadge', () => {
  beforeAll(() => {
    window.ResizeObserver = ResizeObserver;
  });

  afterEach(() => {
    cleanup();
  });

  it('renders with high confidence', () => {
    render(<GeocodingConfidenceBadge confidence={0.9} source="osm" />);
    expect(screen.getByText('High')).toBeDefined();
    expect(screen.getByText('OSM')).toBeDefined();
  });

  it('renders with medium confidence', () => {
    render(<GeocodingConfidenceBadge confidence={0.6} source="osm" />);
    expect(screen.getByText('Medium')).toBeDefined();
  });

  it('renders with low confidence', () => {
    render(<GeocodingConfidenceBadge confidence={0.3} source="osm" />);
    expect(screen.getByText('Low')).toBeDefined();
  });

  it('renders with manual verification', () => {
    render(<GeocodingConfidenceBadge confidence={0.5} source="manual" isManuallyVerified={true} />);
    expect(screen.getAllByText('Manual')).toBeDefined();
  });

  it('renders tooltip on hover', async () => {
    render(<GeocodingConfidenceBadge confidence={0.9} source="osm" />);

    const trigger = screen.getByText('High').parentElement;
    if (!trigger) throw new Error('Trigger not found');

    // Tooltip content should not be visible initially (or accessible name should be different)
    // Actually Radix renders content in a portal, so it might not be in the DOM until triggered.
    const tooltipText = 'High confidence (90%) from OSM';
    expect(screen.queryByText(tooltipText)).toBeNull();

    fireEvent.mouseEnter(trigger);
    fireEvent.focus(trigger);

    // Wait for tooltip to appear
    await waitFor(() => {
      const tooltip = screen.getByRole('tooltip');
      expect(tooltip.textContent).toContain(tooltipText);
    });
  });

  it('renders as a button when onClick is provided', () => {
    render(<GeocodingConfidenceBadge confidence={0.9} source="osm" onClick={() => {}} />);
    expect(screen.getByRole('button')).toBeDefined();
  });

  it('renders as a div when onClick is not provided', () => {
    render(<GeocodingConfidenceBadge confidence={0.9} source="osm" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

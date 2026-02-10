import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GeocodingConfidenceBadge } from './geocoding-confidence-badge';
import '@testing-library/jest-dom'; // Ensure jest-dom matchers are available

describe('geocodingConfidenceBadge', () => {
  it('renders as a div when no onClick is provided', () => {
    render(<GeocodingConfidenceBadge confidence={0.9} source="osm" />);

    // Check if it's a div (implied by not having button role by default)
    // However, explicit check for tagName is better
    const badge = screen.getByText('High').closest('div');
    expect(badge).toBeDefined();
    expect(badge?.tagName).toBe('DIV');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders as a button when onClick is provided', () => {
    const handleClick = vi.fn();
    render(<GeocodingConfidenceBadge confidence={0.9} source="osm" onClick={handleClick} />);

    const button = screen.getByRole('button');
    expect(button).toBeDefined();
    expect(button.tagName).toBe('BUTTON');

    // Verify click handler
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('has appropriate aria-label when interactive', () => {
    const handleClick = vi.fn();
    render(<GeocodingConfidenceBadge confidence={0.9} source="osm" onClick={handleClick} />);

    const button = screen.getByRole('button');
    // We expect the aria-label to contain relevant info
    expect(button).toHaveAttribute('aria-label');
    expect(button.getAttribute('aria-label')).toContain('High confidence');
    expect(button.getAttribute('aria-label')).toContain('Edit');
  });

  it('has type="button" when interactive', () => {
    const handleClick = vi.fn();
    render(<GeocodingConfidenceBadge confidence={0.9} source="osm" onClick={handleClick} />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'button');
  });
});

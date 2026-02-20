import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InviteDialog } from './invite-dialog';

// Mock the Convex hook
const mockInviteCollaborator = vi.fn();

vi.mock('convex/react', () => ({
  useMutation: vi.fn(() => mockInviteCollaborator),
}));

// Mock the api object
vi.mock('@pathfinding/convex-client', () => ({
  api: {
    itineraryCollaborators: {
      inviteCollaborator: 'inviteCollaborator',
    },
  },
}));

describe('inviteDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    itineraryId: 'itinerary-123',
    currentUserId: 'user-456',
  };

  it('renders correctly when open', () => {
    render(<InviteDialog {...defaultProps} />);

    // Check for accessibility role
    expect(screen.getByRole('dialog', { name: /invite collaborator/i })).toBeDefined();

    expect(screen.getByText('Invite Collaborator')).toBeDefined();
    expect(screen.getByText('Add people to collaborate on this itinerary')).toBeDefined();
    expect(screen.getByLabelText(/user id or email/i)).toBeDefined();
    expect(screen.getByLabelText(/role/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /send invitation/i })).toBeDefined();
  });

  it('does not render when closed', () => {
    render(<InviteDialog {...defaultProps} isOpen={false} />);

    const dialog = screen.queryByText('Invite Collaborator');
    expect(dialog).toBeNull();
  });

  it('calls onClose when close button is clicked', () => {
    render(<InviteDialog {...defaultProps} />);

    // There are two close buttons: one in the header (X) and one in the footer
    const closeButtons = screen.getAllByRole('button', { name: 'Close' });
    expect(closeButtons.length).toBeGreaterThan(0);

    fireEvent.click(closeButtons[0]);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls inviteCollaborator when form is submitted', async () => {
    mockInviteCollaborator.mockResolvedValue({});
    render(<InviteDialog {...defaultProps} />);

    const userIdInput = screen.getByLabelText(/user id or email/i);
    fireEvent.change(userIdInput, { target: { value: 'user-789' } });

    const submitButton = screen.getByRole('button', { name: /send invitation/i });
    fireEvent.click(submitButton);

    expect(mockInviteCollaborator).toHaveBeenCalledWith({
      itineraryId: 'itinerary-123',
      userId: 'user-789',
      role: 'editor',
      invitedBy: 'user-456',
    });
  });

  it('validates user input before submitting', async () => {
    render(<InviteDialog {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: /send invitation/i });

    // Button should be disabled initially or validation prevents submission
    // Based on component logic: disabled={isInviting || !userId.trim()}
    expect(submitButton).toHaveProperty('disabled', true);

    const userIdInput = screen.getByLabelText(/user id or email/i);
    fireEvent.change(userIdInput, { target: { value: '   ' } });

    expect(submitButton).toHaveProperty('disabled', true);
  });
});

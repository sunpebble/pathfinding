import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InviteDialog } from "./invite-dialog";

// Mock Convex hooks
vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
}));

// Mock API object
vi.mock("@pathfinding/convex-client", () => ({
  api: {
    itineraryCollaborators: {
      inviteCollaborator: "inviteCollaborator",
    },
  },
}));

// Mock ResizeObserver for Radix UI
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe("InviteDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders correctly when open", () => {
    render(
      <InviteDialog
        isOpen={true}
        onClose={() => {}}
        itineraryId="itinerary-123"
        currentUserId="user-123"
      />,
    );

    expect(screen.getByText("Invite Collaborator")).toBeDefined();
    expect(
      screen.getByText("Add people to collaborate on this itinerary"),
    ).toBeDefined();
    expect(screen.getByLabelText("User ID or Email")).toBeDefined();
    expect(screen.getByText("Shareable Link")).toBeDefined();
  });

  it("does not render when closed", () => {
    render(
      <InviteDialog
        isOpen={false}
        onClose={() => {}}
        itineraryId="itinerary-123"
        currentUserId="user-123"
      />,
    );

    expect(screen.queryByText("Invite Collaborator")).toBeNull();
  });
});

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthButton } from "./auth-button";

// Mock ResizeObserver for Radix UI
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock PointerEvent and related methods for Radix UI
class MockPointerEvent extends Event {
  button: number;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  constructor(type: string, props: PointerEventInit) {
    super(type, props);
    this.button = props.button || 0;
    this.ctrlKey = props.ctrlKey || false;
    this.metaKey = props.metaKey || false;
    this.shiftKey = props.shiftKey || false;
    this.altKey = props.altKey || false;
  }
}
window.PointerEvent = MockPointerEvent as unknown as typeof PointerEvent;
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn();

// Mock useRouter
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock useAuthActions
const mockSignOut = vi.fn();
vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({
    signOut: mockSignOut,
  }),
}));

// Mock useQuery
const mockUseQuery = vi.fn();
vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

// Mock api object (just an empty object is fine since we mock useQuery return value)
vi.mock("@pathfinding/convex-client", () => ({
  api: {
    users: {
      getCurrentUser: "users:getCurrentUser",
    },
  },
}));

describe("authButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders loading state initially", () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: true });
    mockUseQuery.mockReturnValue(undefined);

    const { container } = render(<AuthButton />);
    expect(container.querySelector(".animate-pulse")).toBeDefined();
  });

  it("renders sign in button when unauthenticated", () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: false });
    mockUseQuery.mockReturnValue(null);

    render(<AuthButton />);
    expect(screen.getByText("Sign In")).toBeDefined();
  });

  it("renders user button when authenticated", () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    mockUseQuery.mockReturnValue({
      name: "Test User",
      email: "test@example.com",
      profile: { displayName: "Test User" },
    });

    render(<AuthButton />);
    expect(screen.getByText("Test User")).toBeDefined();
    expect(screen.getByText("T")).toBeDefined(); // Initial
  });

  it("opens menu on click", async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    mockUseQuery.mockReturnValue({
      name: "Test User",
      email: "test@example.com",
      profile: { displayName: "Test User" },
    });

    render(<AuthButton />);
    const button = screen.getByRole("button");
    fireEvent.pointerDown(button);
    fireEvent.click(button);

    expect(await screen.findByText("Profile")).toBeDefined();
    expect(screen.getByText("Sign Out")).toBeDefined();
    expect(screen.getByText("test@example.com")).toBeDefined();
  });

  it("calls signOut on sign out click", async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    mockUseQuery.mockReturnValue({
      name: "Test User",
      email: "test@example.com",
      profile: { displayName: "Test User" },
    });

    render(<AuthButton />);
    const button = screen.getByRole("button");
    fireEvent.pointerDown(button);
    fireEvent.click(button);

    const signOutButton = await screen.findByText("Sign Out");
    fireEvent.click(signOutButton);

    expect(mockSignOut).toHaveBeenCalled();
  });
});

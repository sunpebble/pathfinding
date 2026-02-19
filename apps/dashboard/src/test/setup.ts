import * as React from "react";
import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => React.createElement("a", { href, ...props }, children),
}));

vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => null),
  useMutation: vi.fn(() => vi.fn()),
  useConvex: vi.fn(() => ({})),
}));

vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: vi.fn(() => ({
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));

vi.mock("@pathfinding/convex-client", () => ({
  api: {
    users: {
      getCurrentUser: "users:getCurrentUser",
    },
  },
}));

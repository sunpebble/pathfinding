import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./error-boundary";

function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test error message");
  }
  return <div>Child content</div>;
}

vi.spyOn(console, "error").mockImplementation(() => {});

describe("errorBoundary", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText("Child content")).toBeDefined();
  });

  it("renders default error UI when error occurs", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeDefined();
    expect(screen.getByText("Test error message")).toBeDefined();
  });

  it("renders custom fallback when provided and error occurs", () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Custom fallback")).toBeDefined();
  });

  it("renders try again button in default error UI", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    const buttons = screen.getAllByRole("button", { name: "Try again" });
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("shows generic error message when error has no message", () => {
    const ThrowingWithoutMessage = () => {
      // eslint-disable-next-line unicorn/error-message -- Testing empty error message handling
      throw new Error();
    };

    render(
      <ErrorBoundary>
        <ThrowingWithoutMessage />
      </ErrorBoundary>,
    );
    expect(screen.getByText("An unexpected error occurred")).toBeDefined();
  });
});

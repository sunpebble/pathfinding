# Testing Patterns

**Analysis Date:** 2026-01-25

## Test Framework

**Runner:**

- Vitest is used for the `dashboard` application.
- Config: `vitest` and `vitest run` scripts are defined in `apps/dashboard/package.json`. No explicit `vitest.config.ts` file was found at the root, but one might exist within the dashboard app or be implicitly configured.

**Assertion Library:**

- `@testing-library/jest-dom` and `@testing-library/react` are used with Vitest in the `dashboard` application, indicating Jest-like assertions and React component testing utilities.

**Run Commands:**

```bash
vitest run              # Run all tests in dashboard
vitest                  # Watch mode for dashboard tests
```

## Test File Organization

**Location:**

- Test files appear to be co-located or within a `test/` subdirectory relative to the code they test.
- Examples found in temporary directories like `packages/utils/src/geoUtils.test.ts` and `packages/utils/src/dateUtils.test.ts`.
- `apps/dashboard/src/test/setup.ts` suggests a centralized setup file for tests.

**Naming:**

- Files are named using the pattern `*.test.ts`.

**Structure:**

```
[src]/
├── [module]/
│   ├── [component].tsx
│   └── [component].test.ts
├── [utils]/
│   ├── [utility].ts
│   └── [utility].test.ts
└── test/
    └── setup.ts
```

## Test Structure

**Suite Organization:**

```typescript
// Example inference from common Vitest/Jest patterns
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('should handle props', () => {
    render(<MyComponent name="Test" />);
    expect(screen.getByText('Hello Test')).toBeInTheDocument();
  });
});
```

**Patterns:**

- **Setup pattern:** A `setup.ts` file (`apps/dashboard/src/test/setup.ts`) is likely used for global test setup, including `jest-dom` extensions.
- **Assertion pattern:** `expect(...).toBeInTheDocument()`, `expect(...).toHaveTextContent()`, and similar Jest-style matchers are used.

## Mocking

**Framework:**

- Vitest's built-in mocking capabilities are likely used, similar to Jest.

**Patterns:**

```typescript
// Example inference from Vitest patterns
import { vi } from 'vitest';

// Mocking a module
vi.mock('@/lib/api', () => ({
  getCrawlJobs: vi.fn(() =>
    Promise.resolve({ data: [], pagination: { total: 0 } })
  ),
}));

// Mocking a function within a module
const mockFunction = vi.fn();
// ... then assert on mockFunction calls
```

**What to Mock:**

- External API calls.
- Expensive computations.
- Modules with side effects (e.g., network requests, database interactions).

**What NOT to Mock:**

- Pure functions that are central to the unit being tested.
- UI components where the actual rendering is being tested (though data dependencies might be mocked).

## Fixtures and Factories

**Test Data:**

```typescript
// Example inference
const mockJob = {
  id: 'job-123',
  name: 'Test Job',
  status: 'completed',
  platform: 'Ctrip',
  statistics: { records_extracted: 10 },
};

// Or
function createMockJob(overrides = {}) {
  return {
    id: 'job-' + Math.random().toString(36).substring(7),
    name: 'Generated Job',
    status: 'running',
    platform: 'Mafengwo',
    statistics: { records_extracted: 0 },
    ...overrides,
  };
}
```

**Location:**

- Test data or factories are likely defined directly within the test files or in a `__fixtures__` / `__mocks__` directory if shared across multiple tests.

## Coverage

**Requirements:**

- No explicit coverage requirements were found in `package.json` scripts beyond running tests. Coverage reporting might be configured within Vitest.

**View Coverage:**

```bash
vitest run --coverage # Likely command for Vitest coverage
```

## Test Types

**Unit Tests:**

- Scope and approach: Focused on individual functions, components, or small modules in isolation. React components are tested using `@testing-library/react`.

**Integration Tests:**

- Scope and approach: Not explicitly found in samples but likely exist for interactions between multiple units, such as API clients interacting with mock servers or Redux/Zustand stores.

**E2E Tests:**

- Not explicitly configured or observed in the provided `package.json` or file search results. "Not used" based on current information.

## Common Patterns

**Async Testing:**

```typescript
// Async operations are handled using `async/await` and `waitFor` from testing library.
it('should load data', async () => {
  render(<MyComponent />);
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText('Data loaded')).toBeInTheDocument());
});
```

**Error Testing:**

```typescript
// Errors are tested by mocking failing requests or simulating error states.
it('should display error message on failure', async () => {
  vi.mocked(myApiCall).mockRejectedValueOnce(new Error('API Error'));
  render(<MyComponent />);
  await waitFor(() => expect(screen.getByText('Failed to load')).toBeInTheDocument());
});
```

---

_Testing analysis: 2026-01-25_

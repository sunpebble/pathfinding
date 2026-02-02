# Bolt's Journal

## 2025-05-18 - Type Mismatch in Union Types
**Learning:** When using a union of Playwright `Page` and Stagehand `Page`, `page.evaluate` becomes uncallable due to subtle signature incompatibilities, even if they look similar.
**Action:** When working with such unions, use type guards to narrow the type before calling `evaluate`, or use `(page as any).evaluate` if you are certain the usage is compatible with both.

## 2025-05-18 - CI Failures from Artifacts
**Learning:** Generated output files (like JSON from crawlers) in source directories can trigger lint errors (e.g., `no-irregular-whitespace`).
**Action:** Always ensure output directories are in `.eslintignore` or cleaned up before CI checks.

## 2024-03-24 - Testing Radix UI DropdownMenu

**Learning:** Radix UI components rely heavily on `PointerEvents` and `ResizeObserver` which are not present in JSDOM by default. To test interactions like opening a `DropdownMenu`, we must mock these globals and use `fireEvent.pointerDown` followed by `fireEvent.click` on the trigger, as simple clicks may be ignored or behave unexpectedly.
**Action:** Always include `ResizeObserver` and `PointerEvent` mocks in test setup when testing Radix UI components, and simulate pointer events for triggers.
